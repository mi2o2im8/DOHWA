import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { decodeCharacterPng, hairSections, layerNames, requestCharacter } from './virtualLayers'
import type { HairSection, Layer } from './virtualLayers'
import './VirtualPage.css'

// 기존 /virtual 경로에서 로그인한 사용자의 제작 화면을 표시
export default function VirtualPage() {
    const [userId, setUserId] = useState<string | null>()
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    if (userId === undefined) return <main className="virtual-studio">로그인 상태를 확인하고 있어요.</main>
    if (userId === null) return <Navigate to="/login" replace />
    return <CharacterStudio key={userId} />
}

function CharacterStudio() {
    const rigDisplay = useRef<HTMLCanvasElement>(null)
    const editingStroke = useRef(false)
    const elapsed = useRef(0)
    const display = useRef<HTMLCanvasElement>(null)
    const overlay = useRef(document.createElement('canvas'))
    const lastPoint = useRef<{ x: number; y: number } | null>(null)
    const uploadVersion = useRef(0)
    const [uploaded, setUploaded] = useState<HTMLCanvasElement | null>(null)
    const [cropBottom, setCropBottom] = useState(100)
    const [source, setSource] = useState<HTMLCanvasElement | null>(null)
    const [masks, setMasks] = useState<Record<Layer, HTMLCanvasElement> | null>(null)
    const [layer, setLayer] = useState<Layer>('eyes')
    const [size, setSize] = useState(30)
    const [erase, setErase] = useState(false)
    const [showMask, setShowMask] = useState(true)
    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [restored, setRestored] = useState<Partial<Record<HairSection | 'eyes', HTMLCanvasElement>>>({})
    const [preview, setPreview] = useState<'edit' | 'restore'>('edit')
    // 100%를 기준으로 앞·옆·뒷머리의 흔들림 폭을 각각 조절한다.
    const [hairStrength, setHairStrength] = useState<Record<HairSection, number>>({
        hair: 100, sideHair: 100, backHair: 100,
    })
    const [message, setMessage] = useState('')

    const editingHair = Object.hasOwn(hairSections, layer)
    const hairSection = editingHair ? layer as HairSection : null
    const selectedRestoration = layer === 'eyes'
        ?restored.eyes
        : hairSection ? restored[hairSection] : undefined
    const movingHair = (Object.keys(hairSections) as HairSection[])
        .filter((section) => restored[section] && hairStrength[section] > 0)
        .map((section) => hairSections[section])

    // 원본과 선택한 마스크를 한 캔버스에서 확인
    function draw() {
        const canvas = display.current
        if (!canvas || !source) return
        const context = canvas.getContext('2d')!
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(preview === 'restore' && selectedRestoration ? selectedRestoration : source, 0, 0)
        if (preview !== 'edit') return
        if (!masks || !showMask) return

        const tint = overlay.current
        tint.width = source.width
        tint.height = source.height
        const tintContext = tint.getContext('2d')!
        tintContext.drawImage(masks[layer], 0, 0)
        tintContext.globalCompositeOperation = 'source-in'
        tintContext.fillStyle = '#a85fe0'
        tintContext.fillRect(0, 0, tint.width, tint.height)
        context.globalAlpha = .48
        context.drawImage(tint, 0, 0)
        context.globalAlpha = 1
    }

    useEffect(draw)

    // 편집 화면 옆에 복원된 머리 레이어를 합쳐 실시간으로 표시한다.
    useEffect(() => {
        const canvas = rigDisplay.current
        if (!canvas || !source || !masks) return
        const context = canvas.getContext('2d')!
        const makeCanvas = () => {
            const result = document.createElement('canvas')
            result.width = source.width
            result.height = source.height
            return result
        }
        const base = makeCanvas()
        const baseContext = base.getContext('2d')!
        baseContext.drawImage(source, 0, 0)
        const patch = makeCanvas()
        const patchContext = patch.getContext('2d')!
        const strands = (['backHair', 'sideHair', 'hair'] as const).flatMap((section) => {
            const background = restored[section]
            if (!background) return []

            patchContext.globalCompositeOperation = 'source-over'
            patchContext.clearRect(0, 0, patch.width, patch.height)
            patchContext.drawImage(background, 0, 0)
            patchContext.globalCompositeOperation = 'destination-in'
            patchContext.drawImage(masks[section], 0, 0)
            baseContext.drawImage(patch, 0, 0)

            const strand = makeCanvas()
            const strandContext = strand.getContext('2d')!
            strandContext.drawImage(source, 0, 0)
            strandContext.globalCompositeOperation = 'destination-in'
            strandContext.drawImage(masks[section], 0, 0)
            const { data } = strandContext.getImageData(0, 0, strand.width, strand.height)
            let top = strand.height
            let bottom = 0
            for (let index = 3; index < data.length; index += 4) {
                if (!data[index]) continue
                const row = Math.floor(index / (strand.width * 4))
                top = Math.min(top, row)
                bottom = Math.max(bottom, row)
            }
            return [{ section, strand, top, bottom }]
        })

        let frame = 0
        let previous = performance.now()
        function animate(now: number) {
            const delta = Math.min(now - previous, 50)
            previous = now
            if (!editingStroke.current) {
                elapsed.current += delta
                context.clearRect(0, 0, base.width, base.height)
                context.drawImage(base, 0, 0)
                strands.forEach(({ section, strand, top, bottom }) => {
                    const phase = { hair: 0, sideHair: .45, backHair: .9 }[section]
                    const amplitude = Math.max(3, strand.width * .02) * hairStrength[section] / 100
                    const sway = Math.sin(elapsed.current / 540 + phase) * amplitude
                    for (let y = top; y <= bottom; y++) {
                        const weight = (y - top) / Math.max(1, bottom - top)
                        context.drawImage(strand, 0, y, strand.width, 1, sway * weight ** 2, y, strand.width, 1)
                    }
                })
            }
            frame = requestAnimationFrame(animate)
        }
        frame = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(frame)
    }, [source, masks, restored, hairStrength])

    async function loadImage(file: File) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            setMessage('PNG, JPG 또는 WebP 이미지를 선택해 주세요.')
            return
        }

        const version = ++uploadVersion.current
        const url = URL.createObjectURL(file)
        setLoading(true)
        setMessage('')
        try {
            const image = new Image()
            image.src = url
            await image.decode()
            if (version !== uploadVersion.current) return
            const scale = Math.min(1, 768 / Math.max(image.naturalWidth, image.naturalHeight))
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
            canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
            setUploaded(canvas)
            setCropBottom(100)
            setSource(canvas)
            setMasks(null)
            setConfirmed(false)
            setRestored({})
            setPreview('edit')
        } catch {
            if (version === uploadVersion.current) setMessage('이미지를 열 수 없어요. 다른 파일을 선택해 주세요.')
        } finally {
            URL.revokeObjectURL(url)
            if (version === uploadVersion.current) setLoading(false)
        }
    }

    // 잘라낸 상반신만 AI에 전달하고, 이전 마스크는 새 구도에 재사용하지 않는다.
    function updateCrop(percent: number) {
        if (!uploaded) return
        const cropped = document.createElement('canvas')
        cropped.width = uploaded.width
        cropped.height = Math.max(1, Math.round(uploaded.height * percent / 100))
        cropped.getContext('2d')!.drawImage(uploaded, 0, 0)
        setCropBottom(percent)
        setSource(cropped)
        setConfirmed(false)
        setMasks(null)
        setRestored({})
        setPreview('edit')
        setMessage('')
    }

    async function analyze() {
        if (!source || !confirmed || processing) return
        setProcessing(true)
        setMessage('상반신 구도를 확인하고 AI로 영역을 분리하고 있어요.')
        try {
            const result = await requestCharacter<{ masks: Record<'hair' | 'face' | 'eyes', string> }>('segment', source)
            const [hair, face, eyes] = await Promise.all([
                decodeCharacterPng(result.masks.hair, true),
                decodeCharacterPng(result.masks.face, true),
                decodeCharacterPng(result.masks.eyes, true),
            ])
            // 앞머리는 AI 결과를 사용하고, 옆머리·뒷머리는 직접 칠할 빈 영역을 만든다.
            const emptyHairMask = () => {
                const canvas = document.createElement('canvas')
                canvas.width = source.width
                canvas.height = source.height
                return canvas
            }
            setMasks({ hair, sideHair: emptyHairMask(), backHair: emptyHairMask(), face, eyes })
            setLayer('hair')
            setRestored({})
            setPreview('edit')
            setShowMask(true)
            setMessage('마스크를 확인하고 빠진 부위는 브러시로 추가해 주세요.')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '자동 분리에 실패했어요.')
        } finally {
            setProcessing(false)
        }
    }

    async function restoreHair(allSections = false) {
        if (!source || !masks || !confirmed || processing || editingStroke.current) return
        const sections = allSections
            ? (Object.keys(hairSections) as HairSection[])
            : hairSection ? [hairSection] : []
        const pending = sections.filter((section) => {
            if (allSections && restored[section]) return false
            const mask = masks[section]
            const { data } = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height)
            return data.some((alpha, index) => index % 4 === 3 && alpha > 0)
        })
        if (!pending.length) {
            setMessage(allSections
                ? '추가로 채울 영역이 없어요. 움직일 영역을 브러시로 먼저 지정해 주세요.'
                : '선택한 영역을 브러시로 먼저 지정해 주세요.')
            return
        }

        setProcessing(true)
        const failed: string[] = []
        try {
            for (const section of pending) {
                const name = hairSections[section]
                setMessage(`${name} 뒤에 가려진 부분을 AI가 그리고 있어요.`)
                try {
                    const result = await requestCharacter<{ image: string }>(
                        'restore', source, masks[section], section,
                    )
                    const image = await decodeCharacterPng(result.image)
                    setRestored((current) => ({ ...current, [section]: image }))
                    if (!allSections) setPreview('restore')
                } catch (error) {
                    const reason = error instanceof Error ? error.message : '가려진 부분을 채우지 못했어요.'
                    failed.push(`${name} · ${reason}`)
                }
            }
            setMessage(failed.length ? failed.join(' / ') : '준비된 머리카락이 미리보기에서 함께 움직여요.')
        } finally {
            setProcessing(false)
        }
    }

    // 눈 마스크와 'eyes'를 서버에 보내 피부 바탕을 요청
    async function fillEyeSkin() {
        if (!source || !masks || !confirmed || processing || editingStroke.current) return

        setProcessing(true)
        setMessage('AI가 눈이 있던 자리를 주변 피부에 맞춰 채우고 있어요.')

        try {
            const result = await requestCharacter<{ image: string }>(
                'restore', source, masks.eyes, 'eyes',
            )
            const image = await decodeCharacterPng(result.image)
            setRestored((current) => ({ ...current, eyes: image }))
            setPreview('restore')
            setMessage('눈 주변을 채웠어요. 가운데 캔버스에서 확인해 보세요.')
        } catch (error) {
            setMessage(error instanceof Error ? error.message : '눈 주변을 채우지 못했어요.')
        } finally {
            setProcessing(false)
        }
    }

    function finishStroke() {
        if (!editingStroke.current) return
        editingStroke.current = false
        lastPoint.current = null
        // 눈 마스크가 바뀌면 이저 채우기 결과를 비운다.
        if (layer === 'eyes' && restored.eyes) {
            setRestored((current) => ({ ...current, eyes: undefined}))
            setMessage('눈 영역이 바뀌었어요. 피부를 다시 채워 주세요.')
        }
        if (hairSection && selectedRestoration) {
            setRestored((current) => ({ ...current, [hairSection]: undefined }))
            setMessage(`${hairSections[hairSection]} 영역이 바뀌었어요. 가려진 부분을 다시 채우면 움직임에 반영돼요.`)
        }
    }

    function paint(event: PointerEvent<HTMLCanvasElement>) {
        if (!masks) return
        const canvas = event.currentTarget
        const bounds = canvas.getBoundingClientRect()
        const point = {
            x: (event.clientX - bounds.left) * canvas.width / bounds.width,
            y: (event.clientY - bounds.top) * canvas.height / bounds.height,
        }
        const from = lastPoint.current
        const context = masks[layer].getContext('2d')!
        context.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
        context.beginPath()
        if (from) {
            context.lineWidth = size
            context.lineCap = 'round'
            context.moveTo(from.x, from.y)
            context.lineTo(point.x, point.y)
            context.stroke()
        } else {
            context.arc(point.x, point.y, size / 2, 0, Math.PI * 2)
            context.fill()
        }
        lastPoint.current = point
        draw()
    }

    function selectLayer(key: Layer) {
        setLayer(key)
        setPreview('edit')
        setShowMask(true)
    }

    return (
        <main className="virtual-studio">
            <Link to="/mypage">← 마이페이지</Link>
            <h1>마이캐릭터 만들기</h1>
            <div className="virtual-workspace">
                <aside className="virtual-controls" aria-labelledby="virtual-layer-title">
                    <h2 id="virtual-layer-title">부위 나누기</h2>
                    <label>캐릭터 이미지
                        <input type="file" disabled={loading || processing} accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                            const file = event.currentTarget.files?.[0]
                            if (file) void loadImage(file)
                            event.currentTarget.value = ''
                        }} />
                    </label>
                    {uploaded && (
                        <label>남길 높이 {cropBottom}%
                            <input type="range" min="10" max="100" value={cropBottom}
                                disabled={loading || processing}
                                onChange={(event) => updateCrop(Number(event.currentTarget.value))} />
                            <span className="virtual-hint">골반이나 다리가 보이면 허리까지만 남도록 잘라 주세요.</span>
                        </label>
                    )}
                    {source && (
                        <label className="virtual-check">
                            <input type="checkbox" checked={confirmed} disabled={processing}
                                onChange={(event) => setConfirmed(event.currentTarget.checked)} />
                            머리부터 최대로 허리까지 보이고 골반·하반신은 없어요.
                        </label>
                    )}
                    <button className="virtual-primary" disabled={!source || !confirmed || loading || processing} onClick={analyze}>
                        {masks ? '부위 다시 찾기' : 'AI로 부위 찾기'}
                    </button>
                    <p className="virtual-hint">AI가 앞머리, 얼굴, 눈 영역을 찾아요. 다시 분리하면 브러시 수정이 초기화돼요.</p>
                    {masks && (
                        <>
                            <fieldset>
                                <legend>편집할 레이어</legend>
                                <div className="virtual-tools">
                                    <button type="button" disabled={processing} aria-pressed={editingHair}
                                        onClick={() => selectLayer(editingHair ? layer : 'hair')}>머리카락</button>
                                    {(['face', 'eyes'] as const).map((key) => (
                                        <button type="button" key={key} disabled={processing} aria-pressed={layer === key}
                                            onClick={() => selectLayer(key)}>{layerNames[key]}</button>
                                    ))}
                                </div>
                            </fieldset>
                            {editingHair && (
                                <fieldset>
                                    <legend>머리카락 영역</legend>
                                    <div className="virtual-tools">
                                        {(Object.keys(hairSections) as (keyof typeof hairSections)[]).map((key) => (
                                            <button type="button" key={key} disabled={processing} aria-pressed={layer === key}
                                                onClick={() => selectLayer(key)}>{hairSections[key]}</button>
                                        ))}
                                    </div>
                                    <p className="virtual-hint">옆머리와 뒷머리는 브러시로 영역을 지정해 주세요.</p>
                                </fieldset>
                            )}
                            <fieldset>
                                <legend>브러시</legend>
                                <div className="virtual-tools">
                                    <button aria-pressed={!erase} onClick={() => setErase(false)}>추가</button>
                                    <button aria-pressed={erase} onClick={() => setErase(true)}>지우기</button>
                                </div>
                                <label>크기 {size}px
                                    <input type="range" min="4" max="100" value={size}
                                        onChange={(event) => setSize(Number(event.currentTarget.value))} />
                                </label>
                                <label className="virtual-check">
                                    <input type="checkbox" checked={showMask}
                                        onChange={(event) => setShowMask(event.currentTarget.checked)} />
                                    마스크 표시
                                </label>
                            </fieldset>
                            {hairSection ? (
                                <div className="virtual-tools">
                                    <button disabled={!confirmed || processing || loading}
                                        onClick={() => void restoreHair(true)}>지정한 머리 뒤 모두 채우기</button>
                                    <button disabled={!confirmed || processing || loading} onClick={() => void restoreHair()}>
                                        {hairSections[hairSection]} 뒤 가려진 부분 채우기
                                    </button>
                                    <button disabled={processing || !selectedRestoration || preview === 'edit'}
                                        onClick={() => setPreview('edit')}>영역 편집</button>
                                    <button disabled={processing || !selectedRestoration}
                                        aria-pressed={preview === 'restore'}
                                        onClick={() => setPreview('restore')}>{hairSections[hairSection]} 뒤 채워진 그림 보기</button>
                                </div>
                            ) : layer === 'eyes' ? (
                                <div className="virtual-tools">
                                    <button disabled={!confirmed || processing || loading}
                                        onClick={() => void fillEyeSkin()}>
                                        눈 주변 피부 채우기
                                    </button>
                                    <button disabled={processing || preview === 'edit'}
                                        onClick={() => setPreview('edit')}>
                                        영역 편집
                                    </button>
                                    <button disabled={processing || !restored.eyes}
                                        onClick={() => setPreview('restore')}>
                                        채워진 피부 보기
                                    </button>
                                </div>
                            ) : (
                                <p className="virtual-hint">
                                    {layerNames[layer]} 영역은 브러시로 수정할 수 있어요. 표정 리깅은 아직 적용되지 않았어요.
                                </p>
                            )}
                        </>
                    )}
                    <p className="virtual-hint" role="status">{loading ? '이미지를 불러오는 중이에요.' : message}</p>
                </aside>
                <section className="virtual-stage" aria-label="이미지 미리보기">
                    {source ? (
                        <canvas
                            ref={display}
                            width={source.width}
                            height={source.height}
                            aria-label="선택한 레이어의 브러시 편집 영역"
                            onPointerDown={(event) => {
                                if (!masks || processing || preview !== 'edit' || !showMask || !event.isPrimary || event.button !== 0) return
                                event.currentTarget.setPointerCapture(event.pointerId)
                                editingStroke.current = true
                                paint(event)
                            }}
                            onPointerMove={(event) => {
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) paint(event)
                            }}
                            onLostPointerCapture={finishStroke}
                        />
                    ) : <p>머리부터 허리까지 보이는 정면 캐릭터 그림을 선택해 주세요.</p>}
                </section>
                <aside className="virtual-controls" aria-labelledby="virtual-motion-title">
                    <h2 id="virtual-motion-title">움직임 조절</h2>
                    {(Object.keys(hairSections) as HairSection[]).map((section) => (
                        <label key={section}>
                            <span>{hairSections[section]} 흔들림 강도 · {hairStrength[section]}%</span>
                            <input type="range" min="0" max="200" step="5" value={hairStrength[section]}
                                disabled={!restored[section]}
                                onChange={(event) => {
                                    const strength = Number(event.currentTarget.value)
                                    setHairStrength((current) => ({ ...current, [section]: strength }))
                                }} />
                        </label>
                    ))}
                {source && masks && (
                    <section className="virtual-stage virtual-motion-preview" aria-label="머리카락 움직임 미리보기">
                        <h2>머리카락 움직임 미리보기</h2>
                        <canvas ref={rigDisplay} width={source.width} height={source.height}
                            aria-label="머리카락 흔들림" />
                        <p className="virtual-hint">
                            {movingHair.length ? `움직이는 영역 · ${movingHair.join(', ')}`
                                : Object.keys(restored).some((key) => restored[key as HairSection])
                                    ? '흔들림 강도를 높이면 움직임을 볼 수 있어요.'
                                    : '머리 영역을 지정하고 가려진 부분을 채워 주세요.'}
                        </p>
                    </section>
                )}
                </aside>
            </div>
        </main>
    )
}
