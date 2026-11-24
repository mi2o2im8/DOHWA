export const groups = [
    { label: '얼굴', layers: ['eyeL', 'eyeR', 'irisL', 'irisR', 'mouth'] },
    { label: '머리카락', layers: ['hairFront', 'hairSide', 'hairBack'] },
] as const

export type LayerId = typeof groups[number]['layers'][number]
export const layerIds: LayerId[] = groups.flatMap<LayerId>(({ layers }) => [...layers])
export const labels: Record<LayerId, string> = {
    eyeL: '왼쪽 눈', eyeR: '오른쪽 눈', irisL: '왼쪽 눈동자', irisR: '오른쪽 눈동자',
    mouth: '입', hairFront: '앞머리', hairSide: '옆머리', hairBack: '뒷머리',
}

export type Point = { x: number; y: number }
export type Tool = 'add' | 'erase' | 'pivot'
export type Motion = {
    angle: number; autoBlink: boolean; blink: number; speed: number;
    sway: number; gazeX: number; gazeY: number; range: number; mouth: number;
}
type Snapshot = { mask: ImageData; pivot: Point | null }
type Layer = {
    mask: HTMLCanvasElement; pivot: Point | null; initial: Snapshot | null;
    undo: Snapshot[]; redo: Snapshot[]; touched: boolean; motion: Motion; rendered?: Sprite | null;
}
type Sprite = {
    texture: HTMLCanvasElement; patch: HTMLCanvasElement; mask: HTMLCanvasElement;
    x: number; y: number; width: number; height: number;
}
export type Editor = {
    source: HTMLCanvasElement; layers: Record<LayerId, Layer>;
    sourcePixels: Uint8ClampedArray; scratch: HTMLCanvasElement; original: string;
}

export function canvas(width: number, height: number) {
    const element = document.createElement('canvas')
    element.width = width
    element.height = height
    return element
}

function context(element: HTMLCanvasElement) {
    return element.getContext('2d')!
}

export async function loadImage(src: string) {
    const image = new Image()
    image.src = src
    await image.decode()
    return image
}

// ⭐ The edit canvas, server PNG and every layer share the same pixel coordinates.
export function createEditor(image: HTMLImageElement, original: string): Editor {
    const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight))
    const imageWidth = Math.round(image.naturalWidth * scale)
    const imageHeight = Math.round(image.naturalHeight * scale)
    const width = Math.max(32, imageWidth)
    const height = Math.max(32, imageHeight)
    const source = canvas(width, height)
    context(source).drawImage(image, Math.floor((width - imageWidth) / 2),
        Math.floor((height - imageHeight) / 2), imageWidth, imageHeight)
    const layers = Object.fromEntries(layerIds.map<[LayerId, Layer]>((id) => [id, {
        mask: canvas(width, height), pivot: null, initial: null, undo: [], redo: [], touched: false,
        motion: { angle: 0, autoBlink: true, blink: 0, speed: 10,
            sway: 35, gazeX: 0, gazeY: 0, range: 65, mouth: 0 },
    }])) as Record<LayerId, Layer>
    return { source, layers, sourcePixels: context(source).getImageData(0, 0, width, height).data,
        scratch: canvas(width, height), original }
}

function snapshot(layer: Layer): Snapshot {
    return { mask: context(layer.mask).getImageData(0, 0, layer.mask.width, layer.mask.height), pivot: layer.pivot }
}

export function startEdit(layer: Layer) {
    layer.touched = true
    layer.undo.push(snapshot(layer))
    if (layer.undo.length > 8) layer.undo.shift()
    layer.redo.length = 0
}

function applySnapshot(layer: Layer, state: Snapshot | null) {
    const ctx = context(layer.mask)
    ctx.clearRect(0, 0, layer.mask.width, layer.mask.height)
    if (state) ctx.putImageData(state.mask, 0, 0)
    layer.pivot = state?.pivot ?? null
    layer.rendered = undefined
}

// ⭐ Reset affects only the selected layer and can itself be undone.
export function changeHistory(layer: Layer, action: 'undo' | 'redo' | 'reset') {
    if (action === 'reset') {
        startEdit(layer)
        applySnapshot(layer, layer.initial)
        return
    }
    const from = layer[action]
    const state = from.pop()
    if (!state) return
    layer[action === 'undo' ? 'redo' : 'undo'].push(snapshot(layer))
    applySnapshot(layer, state)
}

export function brushStroke(layer: Layer, tool: Tool, size: number, from: Point, to: Point) {
    if (tool === 'pivot') {
        layer.pivot = to
        return
    }
    const g = context(layer.mask)
    g.save()
    g.globalCompositeOperation = tool === 'erase' ? 'destination-out' : 'source-over'
    g.lineWidth = size
    g.lineCap = 'round'
    g.beginPath()
    if (from === to) {
        g.arc(to.x, to.y, size / 2, 0, Math.PI * 2)
        g.fill()
    } else {
        g.moveTo(from.x, from.y)
        g.lineTo(to.x, to.y)
        g.stroke()
    }
    g.restore()
    layer.rendered = undefined
}

export async function detectLayers(editor: Editor, signal: AbortSignal) {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const response = await fetch(`${base.replace(/\/$/, '')}/virtual/segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: editor.source.toDataURL('image/png').split(',')[1], upper_body_confirmed: true }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(120_000)]),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : '자동 감지 요청에 실패했어요.')
    if (!result?.masks || typeof result.masks !== 'object') throw new Error('서버에서 마스크를 받지 못했어요.')

    const aliases: Partial<Record<LayerId, string>> = {
        eyeL: 'leftEye', eyeR: 'rightEye', hairFront: 'hair', hairSide: 'sideHair',
        hairBack: 'backHair', irisL: 'leftIris', irisR: 'rightIris',
    }
    const { width, height } = editor.source
    const decoded = await Promise.allSettled(layerIds.map(async (id) => {
        const value: unknown = result.masks[aliases[id] ?? id]
        if (typeof value !== 'string') return null
        const image = await loadImage(`data:image/png;base64,${value}`)
        if (image.naturalWidth !== width || image.naturalHeight !== height) return null
        const g = context(canvas(width, height))
        g.drawImage(image, 0, 0)
        const mask = g.getImageData(0, 0, width, height)
        let hasArea = false
        // FastAPI returns grayscale PNGs. Convert luminance to canvas mask alpha.
        for (let i = 0; i < mask.data.length; i += 4) {
            const alpha = mask.data[i] * mask.data[i + 3] / 255
            mask.data[i + 3] = alpha
            hasArea ||= alpha > 0
        }
        return hasArea ? { id, mask } : null
    }))
    signal.throwIfAborted()
    const detected: LayerId[] = []
    for (const item of decoded) {
        if (item.status !== 'fulfilled' || !item.value) continue
        const { id, mask } = item.value
        const layer = editor.layers[id]
        layer.initial = { mask, pivot: null }
        if (!layer.touched) applySnapshot(layer, layer.initial)
        detected.push(id)
    }
    return detected
}

export function drawEdit(target: HTMLCanvasElement, editor: Editor, id: LayerId) {
    const g = context(target)
    const layer = editor.layers[id]
    const overlay = context(editor.scratch)
    g.clearRect(0, 0, target.width, target.height)
    g.drawImage(editor.source, 0, 0)
    overlay.clearRect(0, 0, target.width, target.height)
    overlay.drawImage(layer.mask, 0, 0)
    overlay.globalCompositeOperation = 'source-in'
    overlay.fillStyle = '#eb4892'
    overlay.fillRect(0, 0, target.width, target.height)
    overlay.globalCompositeOperation = 'source-over'
    g.globalAlpha = 0.45
    g.drawImage(editor.scratch, 0, 0)
    g.globalAlpha = 1
    if (layer.pivot) {
        g.beginPath()
        g.arc(layer.pivot.x, layer.pivot.y, 5, 0, Math.PI * 2)
        g.fillStyle = '#78284e'
        g.strokeStyle = 'white'
        g.lineWidth = 2
        g.fill()
        g.stroke()
    }
}

function sprite(editor: Editor, id: LayerId): Sprite | null {
    const layer = editor.layers[id]
    if (layer.rendered !== undefined) return layer.rendered
    const { width, height } = editor.source
    const pixels = context(layer.mask).getImageData(0, 0, width, height).data
    let left = width
    let right = -1
    let top = height
    let bottom = -1
    for (let i = 3; i < pixels.length; i += 4) {
        if (!pixels[i]) continue
        const x = ((i - 3) / 4) % width
        const y = Math.floor(((i - 3) / 4) / width)
        left = Math.min(left, x)
        right = Math.max(right, x)
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
    }
    if (right < left) return (layer.rendered = null)
    const w = right - left + 1
    const h = bottom - top + 1
    const mask = canvas(w, h)
    context(mask).drawImage(layer.mask, -left, -top)
    const texture = canvas(w, h)
    const g = context(texture)
    g.drawImage(editor.source, -left, -top)
    g.globalCompositeOperation = 'destination-in'
    g.drawImage(mask, 0, 0)

    // Local color interpolation fills the exposed area between adjacent source pixels.
    const patch = canvas(w, h)
    const fillContext = context(patch)
    const fill = fillContext.createImageData(w, h)
    const original = editor.sourcePixels
    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right;) {
            const row = y * width
            if (!pixels[(row + x) * 4 + 3]) { x++; continue }
            const start = x
            while (x <= right && pixels[(row + x) * 4 + 3]) x++
            const first = (row + Math.max(0, start - 1)) * 4
            const last = (row + Math.min(width - 1, x)) * 4
            for (let column = start; column < x; column++) {
                const weight = (column - start + 1) / (x - start + 1)
                const dest = ((y - top) * w + column - left) * 4
                for (let channel = 0; channel < 4; channel++) {
                    fill.data[dest + channel] = original[first + channel] * (1 - weight) + original[last + channel] * weight
                }
            }
        }
    }
    fillContext.putImageData(fill, 0, 0)
    fillContext.globalCompositeOperation = 'destination-in'
    fillContext.drawImage(mask, 0, 0)
    return (layer.rendered = { texture, patch, mask, x: left, y: top, width: w, height: h })
}

function clearSprite(g: CanvasRenderingContext2D, part: Sprite) {
    g.globalCompositeOperation = 'destination-out'
    g.drawImage(part.mask, part.x, part.y)
    g.globalCompositeOperation = 'source-over'
    g.drawImage(part.patch, part.x, part.y)
}

const hairMotion = [
    { id: 'hairBack', frequency: 1.7, phase: 0.7, amplitude: 0.055 },
    { id: 'hairSide', frequency: 2.1, phase: -0.9, amplitude: 0.07 },
    { id: 'hairFront', frequency: 2.9, phase: 0, amplitude: 0.05 },
] as const

export function blinkAmount(motion: Motion, seconds: number) {
    // ⭐ Each eye has its own angle. Auto mode always owns the closure amount.
    if (!motion.autoBlink) return motion.blink / 100
    const interval = 3.6 * 10 / motion.speed
    const phase = seconds % interval
    if (phase < 0.067) return phase / 0.067
    if (phase < 0.108) return 1
    return Math.max(0, 1 - (phase - 0.108) / 0.142)
}

export function drawMotion(target: HTMLCanvasElement, editor: Editor, seconds: number) {
    const g = context(target)
    g.clearRect(0, 0, target.width, target.height)
    g.drawImage(editor.source, 0, 0)
    const hair = hairMotion.flatMap(({ id, ...wave }) => {
        const layer = editor.layers[id]
        const part = layer.motion.sway ? sprite(editor, id) : null
        return part ? [{ layer, part, ...wave }] : []
    })
    for (const { part } of hair) clearSprite(g, part)
    for (const { layer, part, frequency, phase, amplitude } of hair) {
        const pivot = layer.pivot ?? { x: part.x + part.width / 2, y: part.y }
        g.save()
        g.translate(pivot.x, pivot.y)
        g.rotate(Math.sin(seconds * frequency + phase) * layer.motion.sway / 100 * amplitude)
        g.drawImage(part.texture, part.x - pivot.x, part.y - pivot.y)
        g.restore()
    }

    const mouth = editor.layers.mouth
    const mouthPart = mouth.motion.mouth ? sprite(editor, 'mouth') : null
    if (mouthPart) {
        clearSprite(g, mouthPart)
        const pivot = mouth.pivot ?? { x: mouthPart.x, y: mouthPart.y }
        g.save()
        g.translate(pivot.x, pivot.y)
        g.scale(1, 1 + mouth.motion.mouth / 380)
        g.drawImage(mouthPart.texture, mouthPart.x - pivot.x, mouthPart.y - pivot.y)
        g.restore()
    }

    for (const [eyeId, irisId] of [['eyeL', 'irisL'], ['eyeR', 'irisR']] as const) {
        const eye = editor.layers[eyeId]
        const part = sprite(editor, eyeId)
        if (!part) continue
        const iris = editor.layers[irisId].motion
        const gaze = iris.gazeX || iris.gazeY ? sprite(editor, irisId) : null
        const blink = blinkAmount(eye.motion, seconds)
        if (!gaze && blink <= 0) continue

        const eyeTexture = context(editor.scratch)
        eyeTexture.clearRect(0, 0, target.width, target.height)
        eyeTexture.drawImage(part.texture, part.x, part.y)
        if (gaze) {
            clearSprite(eyeTexture, gaze)
            const range = iris.range / 100
            eyeTexture.drawImage(gaze.texture, gaze.x + iris.gazeX / 100 * range * part.width * 0.23,
                gaze.y + iris.gazeY / 100 * range * part.height * 0.19)
            eyeTexture.globalCompositeOperation = 'destination-in'
            // The eye mask clips the shifted iris to the actual drawn shape.
            eyeTexture.drawImage(editor.layers[eyeId].mask, 0, 0)
            eyeTexture.globalCompositeOperation = 'source-over'
        }
        clearSprite(g, part)
        const pivot = eye.pivot ?? { x: part.x + part.width / 2, y: part.y + part.height * 0.58 }
        const angle = eye.motion.angle * Math.PI / 180
        g.save()
        g.translate(pivot.x, pivot.y)
        g.rotate(angle)
        if (blink < 0.985) {
            g.save()
            g.scale(1, Math.max(0.02, 1 - blink))
            g.rotate(-angle)
            g.drawImage(editor.scratch, -pivot.x, -pivot.y)
            g.restore()
        }
        if (blink > 0.72) {
            g.globalAlpha = (blink - 0.72) / 0.28
            g.lineWidth = Math.max(1, part.height * 0.09)
            g.lineCap = 'round'
            g.strokeStyle = '#412335'
            const half = part.width * 0.36
            g.beginPath()
            g.moveTo(-half, 0)
            g.quadraticCurveTo(0, part.height * 0.24, half, 0)
            g.stroke()
        }
        g.restore()
    }
}
