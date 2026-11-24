// 마이 버추얼 제작 페이지

// 마이 버추얼 제작 페이지

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent } from 'react'
import { Link } from 'react-router'
import { brushStroke, changeHistory, createEditor, detectLayers, drawEdit,
    drawMotion, groups, labels, layerIds, loadImage, startEdit } from './characterEditor'
import type { Editor, LayerId, Motion, Point, Tool } from './characterEditor'
import './VirtualPage.css'

const tools: { id: Tool; label: string }[] = [
    { id: 'add', label: '영역 추가' }, { id: 'erase', label: '지우기' }, { id: 'pivot', label: '기준점 지정' },
]

function readOriginal(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했어요.'))
        reader.readAsDataURL(file)
    })
}

function canvasPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    const { width, height } = event.currentTarget
    return {
        x: Math.max(0, Math.min(width - 1, (event.clientX - rect.left) * width / rect.width)),
        y: Math.max(0, Math.min(height - 1, (event.clientY - rect.top) * height / rect.height)),
    }
}

function Range({ label, value, min = 0, max = 100, unit = '%', onChange }: {
    label: string; value: number; min?: number; max?: number; unit?: string; onChange: (value: number) => void;
}) {
    const id = useId()
    return <div className="dohwa-studio-range">
        <span><label htmlFor={id}>{label}</label><output htmlFor={id}>{value}{unit}</output></span>
        <input id={id} type="range" min={min} max={max} value={value}
            onChange={(event) => onChange(Number(event.target.value))} />
    </div>
}

function LayerSettings({ id, motion, update }: { id: LayerId; motion: Motion; update: (patch: Partial<Motion>) => void }) {
    if (id === 'eyeL' || id === 'eyeR') {
        return <>
            <Range label={`${labels[id]} 감기는 각도`} min={-45} max={45} unit="°"
                value={motion.angle} onChange={(angle) => update({ angle })} />
            <label className="dohwa-studio-check">
                <input type="checkbox" checked={motion.autoBlink}
                    onChange={(event) => update({ autoBlink: event.target.checked })} /> 자동 깜빡임
            </label>
            <fieldset disabled={motion.autoBlink}>
                <Range label="수동 감김 정도" value={motion.blink} onChange={(blink) => update({ blink })} />
            </fieldset>
            <Range label="깜빡임 속도" min={4} max={20} value={motion.speed} unit=""
                onChange={(speed) => update({ speed })} />
        </>
    }
    if (id === 'irisL' || id === 'irisR') {
        const aim = (event: PointerEvent<HTMLDivElement>) => {
            const { left, top, width, height } = event.currentTarget.getBoundingClientRect()
            const percent = (fraction: number) => Math.round(Math.min(1, Math.max(0, fraction)) * 200 - 100)
            update({ gazeX: percent((event.clientX - left) / width), gazeY: percent((event.clientY - top) / height) })
        }
        return <>
            <p>눈과 눈동자 영역을 지정한 뒤 시선을 움직여 보세요.</p>
            <div className="dohwa-studio-gaze" aria-hidden="true"
                onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); aim(event) }}
                onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) aim(event) }}>
                <i style={{ left: `${(motion.gazeX + 100) / 2}%`, top: `${(motion.gazeY + 100) / 2}%` }} />
            </div>
            <Range label="좌우" min={-100} value={motion.gazeX} onChange={(gazeX) => update({ gazeX })} />
            <Range label="상하" min={-100} value={motion.gazeY} onChange={(gazeY) => update({ gazeY })} />
            <Range label="이동 범위" value={motion.range} onChange={(range) => update({ range })} />
            <button type="button" onClick={() => update({ gazeX: 0, gazeY: 0 })}>정면</button>
        </>
    }
    if (id === 'mouth') return <Range label="입 벌림" value={motion.mouth} onChange={(mouth) => update({ mouth })} />
    return <Range label="흔들림 강도" value={motion.sway} onChange={(sway) => update({ sway })} />
}

export default function VirtualPage() {
    // 업로드한 이미지의 구도 확인에 쓰는 값
    // image는 읽어 온 이미지 객체, original은 원본 이미지의 Data URL 문자열
    const [review, setReview] = useState<{ image: HTMLImageElement; original: string }>()

    // 사용자가 이미지 구도를 확인했는지 여부 (처음에는 확인 전)
    const [confirmed, setConfirmed] = useState(false)

    // 마스크와 레이어를 편집할 때 사용하는 편집기 데이터 (처음에는 비어 있음)
    const [editor, setEditor] = useState<Editor>()

    // 현재 선택한 레이어 (기본값은 왼쪽 눈)
    const [active, setActive] = useState<LayerId>('eyeL')

    // 현재 선택한 편집 도구 (기본값은 영역 추가)
    const [tool, setTool] = useState<Tool>('add')

    // 현재 브러시 크기 (기본값은 26)
    const [size, setSize] = useState(26)

    // 자동 감지된 레이어의 ID 목록 (처음에는 빈 목록)
    const [detected, setDetected] = useState<LayerId[]>([])

    // 현재 자동 감지가 진행 중인지 여부
    const [detecting, setDetecting] = useState(false)

    // 자동 감지가 실패했는지 여부
    const [detectionFailed, setDetectionFailed] = useState(false)

    // 화면에 보여 줄 진행 상태 안내 문구
    const [status, setStatus] = useState('')

    // 이미지 업로드 중 문제가 생겼을 때 보여 줄 오류 문구
    const [uploadError, setUploadError] = useState('')

    // 편집 상태의 변경을 나타내는 숫자 (0부터 시작)
    const [revision, setRevision] = useState(0)

    // 실제 화면 요소에 접근하기 위한 참조 (요소가 연결되기 전에는 null)
    const dialog = useRef<HTMLDialogElement>(null) // 이미지 구도 확인 창
    const upload = useRef<HTMLInputElement>(null) // 이미지 파일 선택 입력창
    const edit = useRef<HTMLCanvasElement>(null) // 마스크를 그리는 편집 캔버스
    const preview = useRef<HTMLCanvasElement>(null)
    const drag = useRef<{ pointer: number; layer: LayerId; point: Point; tool: Tool; size: number } | null>(null)
    const request = useRef<AbortController | null>(null)
    const uploadTicket = useRef(0)

    useEffect(() => () => {
        request.current?.abort()
        uploadTicket.current++
    }, [])
    useEffect(() => {
        if (review && !dialog.current?.open) dialog.current?.showModal()
    }, [review])
    useEffect(() => {
        if (editor && edit.current) drawEdit(edit.current, editor, active)
    }, [editor, active, revision])

    // Control changes update the running preview without restarting its clock.
    useEffect(() => {
        if (!editor || !preview.current) return
        const target = preview.current
        const started = performance.now()
        let frame = 0
        let last = -Infinity
        const tick = (now: number) => {
            if (now - last >= 30) {
                drawMotion(target, editor, (now - started) / 1000)
                last = now
            }
            frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [editor])

    const refresh = () => setRevision((previous) => previous + 1)
    async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        const ticket = ++uploadTicket.current
        setUploadError('')
        try {
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
                throw new Error('4MB 이하의 PNG, JPG, WebP 이미지를 선택해 주세요.')
            }
            const original = await readOriginal(file)
            const image = await loadImage(original)
            if (ticket !== uploadTicket.current) return
            setConfirmed(false)
            setReview({ image, original })
        } catch (error) {
            if (ticket === uploadTicket.current) {
                setUploadError(error instanceof Error && !(error instanceof DOMException)
                    ? error.message : '이미지를 열 수 없어요. 다른 파일을 선택해 주세요.')
            }
        }
    }

    function confirmImage() {
        if (!review || !confirmed) return
        const next = createEditor(review.image, review.original)
        drag.current = null
        setEditor(next)
        setActive('eyeL')
        setDetected([])
        dialog.current?.close()
        void runDetection(next)
    }

    // Run detection on the current image, keeping any brush edits during a retry.
    async function runDetection(next: Editor) {
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setDetecting(true)
        setDetectionFailed(false)
        setStatus('AI가 그림의 영역을 감지하고 있어요. 브러시 편집을 시작할 수 있어요.')
        try {
            const found = await detectLayers(next, controller.signal)
            if (controller.signal.aborted) return
            setDetected(found)
            setStatus(found.length === layerIds.length ? '모든 레이어의 영역을 감지했어요.'
                : found.length ? `자동 감지 ${found.length}/${layerIds.length}개 · 나머지 영역은 브러시로 지정해 주세요.`
                    : '자동 감지된 영역이 없어요. 브러시로 영역을 지정할 수 있어요.')
            refresh()
        } catch (error) {
            if (!controller.signal.aborted) {
                const detail = error instanceof Error && !(error instanceof TypeError || error instanceof SyntaxError)
                    ? error.message : '영역 감지 서버에 연결할 수 없어요.'
                setDetectionFailed(true)
                setStatus(`${detail} 원본을 유지했어요. 브러시로 계속 편집할 수 있어요.`)
            }
        } finally {
            if (!controller.signal.aborted) setDetecting(false)
        }
    }

    function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
        if (!editor || drag.current || event.button !== 0) return
        const point = canvasPoint(event)
        const layer = editor.layers[active]
        startEdit(layer)
        brushStroke(layer, tool, size, point, point)
        if (tool !== 'pivot') {
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { pointer: event.pointerId, layer: active, point, tool, size }
        }
        refresh()
    }

    function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
        const stroke = drag.current
        if (!editor || !stroke || stroke.pointer !== event.pointerId) return
        const point = canvasPoint(event)
        brushStroke(editor.layers[stroke.layer], stroke.tool, stroke.size, stroke.point, point)
        stroke.point = point
        drawEdit(event.currentTarget, editor, active)
    }

    function endStroke(event: PointerEvent<HTMLCanvasElement>) {
        if (drag.current?.pointer === event.pointerId) drag.current = null
    }

    const layer = editor?.layers[active]
    return <main className="dohwa-studio">
        <header className="dohwa-studio-header">
            <div><Link to="/virtual">버추얼 갤러리</Link><h1>마이캐릭터 제작</h1></div>
        </header>
        <div className="dohwa-studio-grid">
            <aside className="dohwa-studio-panel">
                <h2>이미지와 레이어</h2>
                <p>머리부터 허리까지 담긴 상반신 그림을 사용해 주세요.</p>
                <label className="dohwa-studio-upload">이미지 업로드
                    <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} />
                </label>
                {uploadError && <p role="alert">{uploadError}</p>}
                <div className="dohwa-studio-original">
                    {editor ? <img src={editor.original} alt="원본 캐릭터" /> : <span>원본 미리보기</span>}
                </div>
                <p className="dohwa-studio-detection" role="status">{status}</p>
                {editor && detectionFailed && <button type="button" disabled={detecting}
                    onClick={() => void runDetection(editor)}>자동 감지 다시 시도</button>}
                <h3>레이어</h3>
                {groups.map(({ label, layers }) => <details key={label} className="dohwa-studio-group" open>
                    <summary>{label}</summary>
                    {layers.map((id) => <button type="button" key={id} aria-pressed={id === active}
                        onClick={() => setActive(id)}>
                        {labels[id]}{detected.includes(id) && <small>자동 감지</small>}
                    </button>)}
                </details>)}
                <h3>브러시 도구</h3>
                <fieldset disabled={!editor}>
                    <div className="dohwa-studio-buttons">
                        {tools.map(({ id, label }) => <button type="button" key={id} aria-pressed={tool === id}
                            onClick={() => setTool(id)}>{label}</button>)}
                    </div>
                    <Range label="브러시 크기" min={3} max={110} unit="px" value={size} onChange={setSize} />
                    <div className="dohwa-studio-buttons">
                        {(['undo', 'redo', 'reset'] as const).map((action, index) => (
                            <button type="button" key={action}
                                disabled={!layer || (action !== 'reset' && !layer[action].length)}
                                onClick={() => { if (layer && !drag.current) { changeHistory(layer, action); refresh() } }}>
                                {['뒤로가기', '앞으로 가기', '원래대로'][index]}
                            </button>
                        ))}
                    </div>
                </fieldset>
            </aside>

            <section className="dohwa-studio-panel dohwa-studio-workspace">
                <h2>리깅 영역 편집</h2>
                <p>편집한 영역과 움직임 설정이 미리보기에 바로 적용돼요.</p>
                <div className="dohwa-studio-canvases">
                    <figure>
                        <figcaption>마스크 편집 <small>{labels[active]}</small></figcaption>
                        <div className="dohwa-studio-stage">
                            {editor ? <canvas ref={edit} width={editor.source.width} height={editor.source.height}
                                aria-label="마스크 편집" onPointerDown={pointerDown} onPointerMove={pointerMove}
                                onPointerUp={endStroke} onPointerCancel={endStroke} onLostPointerCapture={endStroke} />
                                : <span>이미지를 먼저 올려 주세요.</span>}
                        </div>
                    </figure>
                    <figure>
                        <figcaption>캐릭터 움직임 미리보기</figcaption>
                        <div className="dohwa-studio-stage">
                            {editor ? <canvas ref={preview} width={editor.source.width} height={editor.source.height}
                                aria-label="캐릭터 움직임 미리보기" /> : <span>움직임 미리보기</span>}
                        </div>
                    </figure>
                </div>
            </section>

            <aside className="dohwa-studio-panel dohwa-studio-settings">
                <h2>{labels[active]} 설정</h2>
                {layer ? <fieldset><LayerSettings id={active} motion={layer.motion}
                    update={(patch) => { Object.assign(layer.motion, patch); refresh() }} /></fieldset>
                    : <p>이미지를 올리면 설정할 수 있어요.</p>}
            </aside>
        </div>
        <dialog className="dohwa-studio-review" ref={dialog} aria-labelledby="dohwa-studio-review-title"
            onClose={() => setReview(undefined)}>
            <h2 id="dohwa-studio-review-title">캐릭터 이미지 확인</h2>
            <p>캐릭터의 머리부터 허리까지 보이는지 확인해 주세요.</p>
            {review && <img src={review.original} alt="선택한 캐릭터 이미지" />}
            <label className="dohwa-studio-check"><input type="checkbox" checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)} /> 머리부터 허리까지 담긴 이미지예요</label>
            <div className="dohwa-studio-buttons">
                <button type="button" onClick={() => dialog.current?.close()}>취소</button>
                <button type="button" onClick={() => upload.current?.click()}>다른 이미지 선택</button>
                <button type="button" className="dohwa-studio-primary" onClick={confirmImage}
                    disabled={!confirmed}>편집에 사용</button>
            </div>
        </dialog>
    </main>
}
