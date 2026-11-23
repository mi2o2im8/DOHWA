// FastAPI에서 받은 마스크를 Canvas 편집기에 불러온다.
export const hairSections = { hair: '앞머리', sideHair: '옆머리', backHair: '뒷머리' } as const
export const layerNames = { ...hairSections, face: '얼굴', eyes: '눈' }
export type HairSection = keyof typeof hairSections
export type Layer = keyof typeof layerNames

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function requestCharacter<T>(path: string, source: HTMLCanvasElement, mask?: HTMLCanvasElement, section?: HairSection|'eyes') {
    const png = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/png').split(',')[1]
    const response = await fetch(`${apiUrl}/virtual/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image: png(source),
            upper_body_confirmed: true,
            ...(mask && { mask: png(mask), section }),
        }),
    })
    if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(typeof body?.detail === 'string' ? body.detail : 'AI 처리에 실패했어요.')
    }
    return await response.json() as T
}

export async function decodeCharacterPng(png: string, asMask = false) {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    if (asMask) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
        for (let offset = 0; offset < pixels.data.length; offset += 4) {
            pixels.data[offset + 3] = pixels.data[offset]
            pixels.data[offset] = 0
            pixels.data[offset + 1] = 0
            pixels.data[offset + 2] = 0
        }
        context.putImageData(pixels, 0, 0)
    }
    return canvas
}
