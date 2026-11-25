import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { categories, workRoomService } from './workRoomService'
import type { Category, PublicRoom, WorkRoomService } from './workRoomService'
import './WorkRoomsPage.css'

type Modal = 'join' | 'create' | 'invite'
type Props = {
    service?: WorkRoomService
    onEnterRoom?: (roomId: string) => void
}

export default function WorkRoomsPage({ service = workRoomService, onEnterRoom }: Props) {
    const [rooms, setRooms] = useState<PublicRoom[]>([])
    const [category, setCategory] = useState<Category | 'all'>('all')
    const [loading, setLoading] = useState(true)
    const [listError, setListError] = useState('')
    const [reload, setReload] = useState(0)
    const [notice, setNotice] = useState('')
    const [modal, setModal] = useState<Modal>('join')
    const [isPrivate, setIsPrivate] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [invite, setInvite] = useState<{ roomNumber: string; password: string }>()
    const [copied, setCopied] = useState(false)
    const [formError, setFormError] = useState('')
    const [busy, setBusy] = useState(false)
    const dialog = useRef<HTMLDialogElement>(null)

    // 공개 목록 조회와 새로고침
    useEffect(() => {
        let active = true
        service.listPublicRooms().then(
            (result) => {
                if (active) setRooms(result)
            },
            () => {
                if (active) setListError('작업방 목록을 불러오지 못했어요.')
            },
        ).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [service, reload])

    function refreshRooms() {
        setListError('')
        setLoading(true)
        setReload((value) => value + 1)
    }

    function openDialog(next: 'join' | 'create') {
        setModal(next)
        setIsPrivate(false)
        setShowPassword(false)
        setFormError('')
        setNotice('')
        dialog.current?.showModal()
    }

    // ⭐ 작업방 내부 라우트가 연결되면 부모에서 이동을 처리합니다.
    function enterRoom(room: { id: string; name: string }) {
        if (onEnterRoom) onEnterRoom(room.id)
        else setNotice(`‘${room.name}’ 입장 확인 완료. 작업방 내부 화면은 연결 예정이에요.`)
    }

    async function joinPublicRoom(id: string) {
        if (busy) return
        setBusy(true)
        setNotice('')
        try {
            enterRoom(await service.joinPublicRoom(id))
        } catch (error) {
            setNotice(error instanceof Error ? error.message : '입장에 실패했어요.')
        } finally {
            setBusy(false)
        }
    }

    // 방 생성과 비공개 입장
    async function submitRoom(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (busy || modal === 'invite') return
        const fields = new FormData(event.currentTarget)
        const password = String(fields.get('password') ?? '')
        setFormError('')
        setBusy(true)

        try {
            if (modal === 'join') {
                const roomNumber = String(fields.get('roomNumber') ?? '').trim()
                if (!/^\d{6}$/.test(roomNumber)) throw new Error('방 번호 6자리를 입력해 주세요.')
                const room = await service.joinPrivateRoom({ roomNumber, password })
                dialog.current?.close()
                enterRoom(room)
                return
            }

            const name = String(fields.get('name') ?? '').trim()
            if (!name) throw new Error('방 이름을 입력해 주세요.')
            if (isPrivate && !password.trim()) throw new Error('비밀번호를 입력해 주세요.')
            const roomCategory = fields.get('category') as Category
            const room = await service.createRoom(isPrivate
                ? { name, category: roomCategory, visibility: 'private', password }
                : { name, category: roomCategory, visibility: 'public' })

            if (room.visibility === 'private') {
                setShowPassword(false)
                setCopied(false)
                setInvite({ roomNumber: room.roomNumber, password })
                setModal('invite')
                return
            }

            dialog.current?.close()
            setCategory('all')
            refreshRooms()
            setNotice('공개 작업방을 만들었어요.')
        } catch (error) {
            setFormError(error instanceof Error ? error.message : '요청에 실패했어요.')
        } finally {
            setBusy(false)
        }
    }

    async function copyInvite() {
        if (!invite) return
        try {
            await navigator.clipboard.writeText(
                `도화 비공개 작업방\n방 번호: ${invite.roomNumber}\n비밀번호: ${invite.password}`,
            )
            setCopied(true)
        } catch {
            setFormError('복사할 수 없어요. 화면에서 방 번호와 비밀번호를 직접 복사해 주세요.')
        }
    }

    const visibleRooms = rooms.filter((room) => category === 'all' || room.category === category)
    const featured = category === 'all' ? visibleRooms.filter((room) => room.featured) : []
    const listed = category === 'all' ? visibleRooms.filter((room) => !room.featured) : visibleRooms

    return (
        <main className="work-rooms">
            {/* 작업방 헤더와 분류 필터 */}
            <header className="work-rooms-heading">
                <h1>오늘은 어디서 그릴까요?</h1>
                <div className="work-rooms-actions">
                    <button disabled={busy} onClick={() => openDialog('join')}>비공개 방 입장</button>
                    <button disabled={busy} className="work-rooms-primary" onClick={() => openDialog('create')}>
                        + 방 만들기
                    </button>
                </div>
            </header>

            <nav className="work-rooms-filters" aria-label="작업방 분류">
                <button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>전체</button>
                {Object.entries(categories).map(([value, label]) => (
                    <button key={value} aria-pressed={category === value}
                        onClick={() => setCategory(value as Category)}>{label}</button>
                ))}
            </nav>

            {notice && <p className="work-rooms-notice" role="status">{notice}</p>}
            {loading && <p role="status">작업방을 불러오는 중이에요.</p>}
            {listError && <p role="alert">{listError} <button onClick={refreshRooms}>다시 시도</button></p>}

            {/* 대표 작업방과 공개 작업방 목록 */}
            {featured.length > 0 && (
                <section className="work-rooms-featured" aria-label="대표 작업방">
                    {featured.map((room) => (
                        <RoomCard key={room.id} room={room} featured busy={busy} onJoin={joinPublicRoom} />
                    ))}
                </section>
            )}

            {!loading && !listError && (
                <section className="work-rooms-list">
                    <h2>열려 있는 작업방</h2>
                    {listed.length === 0 && <p>이 분류에 열린 작업방이 없어요.</p>}
                    {listed.map((room) => (
                        <RoomCard key={room.id} room={room} busy={busy} onJoin={joinPublicRoom} />
                    ))}
                </section>
            )}

            {/* 비공개 입장 / 방 만들기 / 초대 정보 */}
            <dialog ref={dialog} className="work-rooms-dialog" aria-labelledby="work-rooms-modal-title"
                onCancel={(event) => { if (busy) event.preventDefault() }}
                onClose={() => { setInvite(undefined); setFormError('') }}>
                <h2 id="work-rooms-modal-title">
                    {modal === 'join' ? '비공개 방 입장' : modal === 'create' ? '방 만들기' : '비공개 방을 만들었어요'}
                </h2>
                {modal === 'invite' && invite ? (
                    <div className="work-rooms-form">
                        <p>초대할 사람에게 방 번호와 비밀번호를 전달해 주세요.</p>
                        <label>방 번호<input readOnly value={invite.roomNumber} /></label>
                        <label>비밀번호<input readOnly type={showPassword ? 'text' : 'password'} value={invite.password} /></label>
                        <button type="button" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                        </button>
                        {formError && <p role="alert">{formError}</p>}
                        {copied && <p role="status">초대 정보를 복사했어요.</p>}
                        <footer className="work-rooms-actions">
                            <button onClick={() => dialog.current?.close()}>닫기</button>
                            <button className="work-rooms-primary" onClick={copyInvite}>초대 정보 복사</button>
                        </footer>
                    </div>
                ) : (
                    <form key={modal} className="work-rooms-form" onSubmit={submitRoom}>
                        {modal === 'join' ? (
                            <>
                                <p>호스트에게 받은 방 번호와 비밀번호를 입력해 주세요.</p>
                                <label>방 번호
                                    <input name="roomNumber" inputMode="numeric" maxLength={6}
                                        pattern="[0-9]{6}" placeholder="ex) 004218" required />
                                </label>
                            </>
                        ) : (
                            <>
                                <label>방 이름<input name="name" placeholder="연습 스케치 작업실" maxLength={40} required /></label>
                                <label>분류
                                    <select name="category">
                                        {Object.entries(categories).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </label>
                                <fieldset className="work-rooms-visibility">
                                    <legend>공개 범위</legend>
                                    <label><input type="radio" name="visibility" checked={!isPrivate}
                                        onChange={() => { setIsPrivate(false); setShowPassword(false) }} />공개</label>
                                    <label><input type="radio" name="visibility" checked={isPrivate}
                                        onChange={() => setIsPrivate(true)} />비공개</label>
                                </fieldset>
                            </>
                        )}

                        {(modal === 'join' || isPrivate) && (
                            <>
                                <label>비밀번호
                                    <input name="password" type={showPassword ? 'text' : 'password'}
                                        maxLength={64} placeholder="비밀번호 입력" required
                                        autoComplete={modal === 'create' ? 'new-password' : 'off'} />
                                </label>
                                <button type="button" className="work-rooms-toggle-password"
                                    aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                                </button>
                            </>
                        )}

                        {formError && <p className="work-rooms-error" role="alert">{formError}</p>}
                        <footer className="work-rooms-actions">
                            <button type="button" disabled={busy} onClick={() => dialog.current?.close()}>취소</button>
                            <button className="work-rooms-primary" disabled={busy}>
                                {busy ? '처리 중…' : modal === 'join' ? '입장하기' : '만들기'}
                            </button>
                        </footer>
                    </form>
                )}
            </dialog>
        </main>
    )
}

function RoomCard({ room, featured, busy, onJoin }: {
    room: PublicRoom
    featured?: boolean
    busy: boolean
    onJoin: (id: string) => void
}) {
    const full = room.memberCount >= room.capacity

    return (
        <article className={`work-rooms-card ${featured ? 'work-rooms-card-featured' : ''}`}>
            <div className="work-rooms-cover">
                {room.coverUrl && <img src={room.coverUrl} alt="" />}
                {featured && <span className="work-rooms-tag">{categories[room.category]}</span>}
                {featured && room.note && <span className="work-rooms-pin">{room.note}</span>}
            </div>
            <div className="work-rooms-card-body">
                <div>
                    <h3>{room.name}</h3>
                    {room.description && <p>{room.description}</p>}
                </div>
                <div className="work-rooms-card-meta">
                    {!featured && <span className="work-rooms-tag">{categories[room.category]}</span>}
                    {room.nextRoundAt && <RoundCountdown endsAt={room.nextRoundAt} />}
                    <span className="work-rooms-count">{room.memberCount}/{room.capacity}명</span>
                    <button disabled={busy || full} onClick={() => onJoin(room.id)}
                        aria-label={full ? undefined : `${room.name} 함께하기`}>
                        {full ? '정원 마감' : '함께하기 ›'}
                    </button>
                </div>
            </div>
        </article>
    )
}

function RoundCountdown({ endsAt }: { endsAt: string }) {
    const [now, setNow] = useState(Date.now)
    const seconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000))

    useEffect(() => {
        if (!Number.isFinite(Date.parse(endsAt))) return
        const timer = window.setInterval(() => {
            const next = Date.now()
            setNow(next)
            if (next >= Date.parse(endsAt)) window.clearInterval(timer)
        }, 1000)
        return () => window.clearInterval(timer)
    }, [endsAt])

    if (!Number.isFinite(seconds)) return null
    const time = [Math.floor(seconds / 60), seconds % 60]
        .map((part) => String(part).padStart(2, '0')).join(':')

    return <span className="work-rooms-countdown">{seconds ? `다음 크로키까지 ${time}` : '크로키 시작'}</span>
}
