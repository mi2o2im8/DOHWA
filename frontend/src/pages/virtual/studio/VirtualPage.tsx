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