// 마이페이지
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, PointerEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { supabase } from '../../../lib/supabase'
import './MyPage.css'

type Crop = { x: number; y: number; zoom: number }
const centered: Crop = { x: 0, y: 0, zoom: 1 }

// 정사각형을 채우는 크기와 드래그 가능한 범위를 계산
function cropBounds(image: HTMLImageElement, zoom: number) {
    const shortestSide = Math.min(image.naturalWidth, image.naturalHeight)
    return {
        width: image.naturalWidth / shortestSide * zoom,
        height: image.naturalHeight / shortestSide * zoom,
    }
}

function limitOffset(value: number, size: number) {
    const limit = (size - 1) / 2
    return Math.max(-limit, Math.min(limit, value))
}

async function loadAvatar(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('JPG, PNG, WebP 사진만 선택할 수 있어요.')
    }
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('10MB 이하의 사진을 선택해 주세요.')
    }

    const image = new Image()
    image.src = URL.createObjectURL(file)
    try {
        await image.decode()
        return image
    } catch {
        URL.revokeObjectURL(image.src)
        throw new Error('사진을 열 수 없어요. 다른 파일을 선택해 주세요.')
    }
}

// 미리보기와 같은 영역을 512 × 512 JPEG로 저장
function cropAvatar(image: HTMLImageElement, crop = centered) {
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('사진 편집을 시작할 수 없어요.')

    const { width, height } = cropBounds(image, crop.zoom)
    context.fillStyle = '#fff'
    context.fillRect(0, 0, size, size)
    context.drawImage(image, (0.5 + crop.x - width / 2) * size,
        (0.5 + crop.y - height / 2) * size, width * size, height * size)

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('사진을 저장할 수 없어요.'))
        }, 'image/jpeg', 0.9)
    })
}

function AvatarCrop({
    image,
    onChange,
}: {
    image: HTMLImageElement
    onChange: (getBlob: () => Promise<Blob>) => void
}) {
    const [crop, setCrop] = useState(centered)
    const drag = useRef<{ id: number; x: number; y: number; crop: Crop } | null>(null)
    const { width, height } = cropBounds(image, crop.zoom)

    function changeCrop(next: Crop) {
        setCrop(next)
        onChange(() => cropAvatar(image, next))
    }

    function changeZoom(event: ChangeEvent<HTMLInputElement>) {
        const zoom = Number(event.target.value)
        const next = cropBounds(image, zoom)
        changeCrop({ zoom, x: limitOffset(crop.x, next.width), y: limitOffset(crop.y, next.height) })
    }

    function startDrag(event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0 || drag.current) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, crop }
    }

    function movePhoto(event: PointerEvent<HTMLDivElement>) {
        const start = drag.current
        if (start?.id !== event.pointerId) return
        const size = event.currentTarget.clientWidth
        changeCrop({
            zoom: crop.zoom,
            x: limitOffset(start.crop.x + (event.clientX - start.x) / size, width),
            y: limitOffset(start.crop.y + (event.clientY - start.y) / size, height),
        })
    }

    return (
        <>
            <div
                className="dohwa-avatar-crop"
                onPointerDown={startDrag}
                onPointerMove={movePhoto}
                onLostPointerCapture={() => { drag.current = null }}
            >
                <img
                    src={image.src}
                    alt="선택한 프로필 사진"
                    draggable={false}
                    style={{
                        width: `${width * 100}%`,
                        height: `${height * 100}%`,
                        left: `${(0.5 + crop.x) * 100}%`,
                        top: `${(0.5 + crop.y) * 100}%`,
                    }}
                />
                <div className="dohwa-avatar-guide" aria-hidden="true" />
            </div>
            <label htmlFor="dohwa-avatar-zoom">사진 확대</label>
            <input id="dohwa-avatar-zoom" type="range" min="1" max="3" step="0.01"
                value={crop.zoom} onChange={changeZoom} />
            <small>드래그해서 사진 위치를 조절하세요.</small>
        </>
    )
}

const publicTabs = [
    { key: 'portfolio', label: '포트폴리오', empty: '아직 등록된 작품이 없어요.' },
    { key: 'clips', label: '도화 클립', empty: '아직 올린 클립이 없어요.' },
    { key: 'posts', label: '커뮤니티 글', empty: '아직 작성한 글이 없어요.' },
]

const ownerTabs = [
    { key: 'character', label: '마이캐릭터' },
    { key: 'settings', label: '계정 설정' },
]

const bucket = 'dohwa-profile-avatars'
const profileColumns = 'nickname, avatar_path, bio, contact_email, contact_phone, show_contact_email, show_contact_phone'

type Profile = {
    nickname: string | null
    avatar_path: string | null
    bio: string | null
    contact_email: string | null
    contact_phone: string | null
    show_contact_email: boolean
    show_contact_phone: boolean
}

function MyPage() {
    const [user, setUser] = useState<{ id: string; email?: string } | null>()
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])

    if (user === undefined) return <main className="mypage">로그인 상태를 확인하고 있어요.</main>
    if (user === null) return <Navigate to="/login" replace />

    return <ProfileSettings key={user.id} userId={user.id} email={user.email} />
}

function ProfileSettings({ userId, email }: { userId: string; email?: string }) {
    const [searchParams, setSearchParams] = useSearchParams()
    const isPreview = searchParams.get('view') === 'public'
    const tabs = isPreview ? publicTabs : [...publicTabs, ...ownerTabs]
    const activeTab = tabs.find((tab) => tab.key === searchParams.get('tab')) ?? publicTabs[0]
    const publicTab = publicTabs.find((tab) => tab.key === activeTab.key)
    const editDialog = useRef<HTMLDialogElement>(null)
    const [attempt, setAttempt] = useState(0)
    const [profile, setProfile] = useState<Profile>()
    const [draft, setDraft] = useState<Profile>()
    const [loadError, setLoadError] = useState('')
    const [extraFieldsError, setExtraFieldsError] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string>()
    const [photo, setPhoto] = useState<HTMLImageElement>()
    const [loadingPhoto, setLoadingPhoto] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const photoJob = useRef(0)
    const getCroppedPhoto = useRef<(() => Promise<Blob>) | null>(null)

    // 로그인한 회원의 프로필 조회
    useEffect(() => {
        let active = true
        async function loadProfile() {
            const { data, error } = await supabase.from('profiles')
                .select(profileColumns).eq('id', userId).maybeSingle()
            if (!active) return
            if (data && !error) {
                setExtraFieldsError('')
                setProfile(data)
                return
            }
            if (!error) {
                setLoadError('이 계정의 프로필을 찾을 수 없어요.')
                return
            }

            // 추가 항목 조회에 실패하면 기존 닉네임 조회로 복구
            const basic = await supabase.from('profiles')
                .select('nickname').eq('id', userId).maybeSingle()
            if (!active) return
            if (basic.error || !basic.data) {
                setLoadError(basic.error
                    ? `프로필을 불러오지 못했어요. (${basic.error.code || '요청 실패'})`
                    : '이 계정의 프로필을 찾을 수 없어요.')
                return
            }

            setExtraFieldsError(`추가 프로필 항목을 불러오지 못했어요. (${error.code || '요청 실패'})`)
            setProfile({
                nickname: basic.data.nickname,
                avatar_path: null,
                bio: null,
                contact_email: null,
                contact_phone: null,
                show_contact_email: false,
                show_contact_phone: false,
            })
        }
        void loadProfile()
        return () => { active = false }
    }, [userId, attempt])

    const avatarPath = profile?.avatar_path
    useEffect(() => {
        if (!avatarPath) return
        let active = true
        void supabase.storage.from(bucket).createSignedUrl(avatarPath, 3600).then(({ data }) => {
            if (active) setAvatarUrl(data?.signedUrl)
        })
        return () => { active = false }
    }, [avatarPath])

    useEffect(() => {
        return () => {
            if (photo) URL.revokeObjectURL(photo.src)
        }
    }, [photo])

    useEffect(() => () => { photoJob.current += 1 }, [])

    async function selectPhoto(file?: File) {
        if (!file) return
        const job = ++photoJob.current
        setError('')
        setLoadingPhoto(true)
        try {
            const image = await loadAvatar(file)
            if (job !== photoJob.current) {
                URL.revokeObjectURL(image.src)
                return
            }
            getCroppedPhoto.current = () => cropAvatar(image)
            setPhoto(image)
        } catch (cause) {
            if (job === photoJob.current && cause instanceof Error) setError(cause.message)
        } finally {
            if (job === photoJob.current) setLoadingPhoto(false)
        }
    }

    function closeEditor() {
        photoJob.current += 1
        getCroppedPhoto.current = null
        setLoadingPhoto(false)
        setPhoto(undefined)
        editDialog.current?.close()
        setDraft(undefined)
        setError('')
    }

    // 사진 경로와 소개, 연락 정보를 함께 저장
    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!draft || saving || loadingPhoto) return
        const nickname = draft.nickname?.trim() || null
        if (nickname && !/^[가-힣a-zA-Z0-9]{1,12}$/.test(nickname)) {
            setError('닉네임은 한글, 영문, 숫자로 12자까지 입력할 수 있어요.')
            return
        }
        setSaving(true)
        setError('')

        const contactEmail = draft.contact_email?.trim() || null
        const contactPhone = draft.contact_phone?.trim() || null
        const fields = {
            nickname,
            bio: draft.bio?.trim() || null,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            show_contact_email: Boolean(contactEmail && draft.show_contact_email),
            show_contact_phone: Boolean(contactPhone && draft.show_contact_phone),
        }

        try {
            if (extraFieldsError) {
                const { data, error } = await supabase.from('profiles')
                    .update({ nickname }).eq('id', userId).select('nickname').maybeSingle()
                if (error?.code === '23505') throw new Error('이미 사용 중인 닉네임이에요.')
                if (error || !data) throw new Error('닉네임을 저장하지 못했어요.')
                setProfile((previous) => previous && { ...previous, nickname: data.nickname })
                closeEditor()
                setNotice('닉네임을 저장했어요.')
                return
            }

            let avatarPath = draft.avatar_path
            if (getCroppedPhoto.current) {
                const blob = await getCroppedPhoto.current()
                avatarPath = `${userId}/${crypto.randomUUID()}.jpg`
                const { error: uploadError } = await supabase.storage.from(bucket)
                    .upload(avatarPath, blob, { contentType: 'image/jpeg' })
                if (uploadError) throw new Error('사진을 업로드하지 못했어요. 다시 시도해 주세요.')
            }

            // 동시에 열린 편집 화면에서 이전 사진을 덮어쓰지 않도록 현재 경로 확인
            let update = supabase.from('profiles').update({ ...fields, avatar_path: avatarPath })
                .eq('id', userId)
            update = draft.avatar_path
                ? update.eq('avatar_path', draft.avatar_path)
                : update.is('avatar_path', null)
            const { data, error: updateError } = await update.select(profileColumns).maybeSingle()
            if (!data && !updateError && avatarPath && avatarPath !== draft.avatar_path) {
                await supabase.storage.from(bucket).remove([avatarPath])
            }
            if (updateError?.code === '23505') {
                if (avatarPath && avatarPath !== draft.avatar_path) {
                    await supabase.storage.from(bucket).remove([avatarPath])
                }
                throw new Error('이미 사용 중인 닉네임이에요.')
            }
            if (updateError) throw new Error('프로필을 저장하지 못했어요. 다시 시도해 주세요.')
            if (!data) throw new Error('사진이 다른 화면에서 변경됐어요. 새로고침한 뒤 다시 수정해 주세요.')

            if (draft.avatar_path && draft.avatar_path !== avatarPath) {
                void supabase.storage.from(bucket).remove([draft.avatar_path])
            }
            setProfile(data)
            closeEditor()
            setNotice('프로필을 저장했어요.')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : '프로필을 저장하지 못했어요.')
        } finally {
            setSaving(false)
        }
    }

    const nickname = profile?.nickname?.trim()
    const displayName = nickname || (profile || loadError ? '도화 회원' : '프로필 불러오는 중…')
    const avatar = avatarUrl
        ? <img src={avatarUrl} alt="프로필 사진" />
        : <span aria-hidden="true">{nickname?.[0] || '도'}</span>

    function openTab(key: string) {
        setSearchParams(isPreview ? { view: 'public', tab: key } : { tab: key })
    }

    return (
        <main className="mypage">
            <h1>{isPreview ? displayName : '마이페이지'}</h1>
            <section className="mypage-profile" aria-label="작가 프로필">
                <div className="mypage-avatar">{avatar}</div>
                <div className="mypage-identity">
                    {isPreview ? <p>공개 화면 미리보기</p> : <h2>{displayName}</h2>}
                    {profile?.bio && <p>{profile.bio}</p>}
                    {isPreview && profile?.show_contact_email && profile.contact_email &&
                        <p>연락용 이메일 · {profile.contact_email}</p>}
                    {isPreview && profile?.show_contact_phone && profile.contact_phone &&
                        <p>연락처 · {profile.contact_phone}</p>}
                </div>
                <div className="mypage-actions">
                    {!isPreview && (
                        <button className="mypage-action mypage-action-primary" type="button"
                            disabled={!profile || Boolean(loadError)} onClick={() => {
                                if (!profile) return
                                setDraft(profile)
                                setNotice('')
                                setError('')
                                editDialog.current?.showModal()
                            }}>프로필 수정</button>
                    )}
                    <button className="mypage-action" type="button" onClick={() => setSearchParams(
                        isPreview ? { tab: activeTab.key } : { view: 'public', tab: publicTab?.key ?? 'portfolio' },
                    )}>{isPreview ? '마이페이지로 돌아가기' : '공개 화면 보기'}</button>
                </div>
            </section>
            {notice && <p role="status">{notice}</p>}
            {(loadError || extraFieldsError) && <div className="mypage-panel" role="status">
                <p>{loadError || extraFieldsError}</p>
                <button className="mypage-action" type="button" onClick={() => {
                    setLoadError('')
                    setAttempt((previous) => previous + 1)
                }}>다시 시도</button>
            </div>}

            <dialog ref={editDialog} className="mypage-dialog" aria-labelledby="mypage-edit-title"
                onCancel={(event) => {
                    event.preventDefault()
                    if (!saving) closeEditor()
                }}>
                <h2 id="mypage-edit-title">프로필 수정</h2>
                {draft && (
                    <form onSubmit={saveProfile}>
                        <fieldset className="dohwa-profile-fields" disabled={saving}>
                            {!extraFieldsError && <section className="dohwa-profile-photo" aria-labelledby="dohwa-photo-title">
                                <h2 id="dohwa-photo-title">프로필 사진</h2>
                                {photo
                                    ? <AvatarCrop key={photo.src} image={photo}
                                        onChange={(getBlob) => { getCroppedPhoto.current = getBlob }} />
                                    : <div className="dohwa-avatar-preview">{avatar}</div>}
                                <label className="dohwa-profile-button dohwa-file-button">
                                    사진 변경
                                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                                        void selectPhoto(event.target.files?.[0])
                                        event.target.value = ''
                                    }} />
                                </label>
                                {loadingPhoto && <small role="status">사진을 여는 중이에요.</small>}
                            </section>}
                            <div className="dohwa-profile-details" style={extraFieldsError ? { gridColumn: '1 / -1', border: 0, padding: 0 } : undefined}>
                                <label htmlFor="mypage-nickname">닉네임</label>
                                <input id="mypage-nickname" maxLength={12} value={draft.nickname ?? ''}
                                    onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
                                {!extraFieldsError && <>
                                <label htmlFor="dohwa-bio">한 줄 소개</label>
                                <input id="dohwa-bio" maxLength={80} value={draft.bio ?? ''}
                                    placeholder="어떤 그림을 그리는지 소개해 보세요."
                                    onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
                                <small className="dohwa-bio-count">{draft.bio?.length ?? 0} / 80</small>

                                <label htmlFor="dohwa-contact-email">연락용 이메일</label>
                                <div className="dohwa-contact-row">
                                    <input id="dohwa-contact-email" type="email" autoComplete="email" maxLength={254}
                                        placeholder="이메일 입력 (선택)" value={draft.contact_email ?? ''}
                                        onChange={(event) => setDraft({ ...draft, contact_email: event.target.value })} />
                                    <label className="dohwa-contact-toggle">
                                        <input type="checkbox" role="switch" aria-label="연락용 이메일 공개"
                                            checked={draft.show_contact_email}
                                            onChange={(event) => setDraft({ ...draft, show_contact_email: event.target.checked })} />
                                        공개
                                    </label>
                                </div>

                                <label htmlFor="dohwa-contact-phone">연락처</label>
                                <div className="dohwa-contact-row">
                                    <input id="dohwa-contact-phone" type="tel" autoComplete="tel" maxLength={32}
                                        placeholder="전화번호 입력 (선택)" value={draft.contact_phone ?? ''}
                                        onChange={(event) => setDraft({ ...draft, contact_phone: event.target.value })} />
                                    <label className="dohwa-contact-toggle">
                                        <input type="checkbox" role="switch" aria-label="전화번호 공개"
                                            checked={draft.show_contact_phone}
                                            onChange={(event) => setDraft({ ...draft, show_contact_phone: event.target.checked })} />
                                        공개
                                    </label>
                                </div>
                                <small>공개를 켠 항목만 공개 화면 미리보기에 표시돼요.</small>
                                </>}
                                {error && <p className="dohwa-profile-error" role="alert">{error}</p>}
                                <div className="dohwa-profile-actions">
                                    <button type="button" className="dohwa-profile-button" onClick={closeEditor}>취소</button>
                                    <button type="submit" className="dohwa-profile-button dohwa-profile-save"
                                        disabled={loadingPhoto}>{saving ? '저장 중…' : '저장'}</button>
                                </div>
                            </div>
                        </fieldset>
                    </form>
                )}
            </dialog>

            <nav className="mypage-tabs" aria-label="프로필 메뉴">
                {tabs.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => openTab(tab.key)}
                        aria-current={tab.key === activeTab.key ? 'true' : undefined}>{tab.label}</button>
                ))}
            </nav>

            <section className="mypage-panel" aria-label={activeTab.label}>
                {publicTab && <p className="mypage-empty">{publicTab.empty}</p>}
                {activeTab.key === 'character' &&
                    <Link className="mypage-action" to="/virtual">마이캐릭터 만들기</Link>}
                {activeTab.key === 'settings' && (
                    <dl>
                        <dt>이메일</dt>
                        <dd>{email ?? '등록된 이메일이 없어요.'}</dd>
                    </dl>
                )}
            </section>
        </main>
    )
}

export default MyPage
