// 클립 페이지
import { useEffect, useRef, useState } from 'react'
import type { UIEvent } from 'react'
import { Link } from 'react-router'
import './ClipsPage.css'

// 추후 DB에서 받을 클립 데이터 구조
type Clip = {
    id: string
    title: string
    author: {
        id: string
        nickname: string
        avatarUrl?: string
    }
    note: string
    colors: string[]
    videoUrl: string
    posterUrl?: string
    chapters: {
        time: number
        label: string
        thumbnailUrl?: string
    }[]
    reactions: {
        likes: number
        comments: number
        bookmarks: number
    }
}

// DB 연동 전에는 빈 목록을 사용하고, 연동 시 조회 결과로 교체
const clips: Clip[] = []

function formatTime(seconds: number) {
    const value = Math.max(0, Math.floor(seconds))
    const minutes = String(Math.floor(value / 60)).padStart(2, '0')
    const remainder = String(value % 60).padStart(2, '0')
    return `${minutes}:${remainder}`
}

// 아이콘 종류 및 SVG 표시
type ClipIconName =
    | 'heart'
    | 'comment'
    | 'bookmark'
    | 'down'
    | 'play'
    | 'close'

function ClipIcon({ name }: { name: ClipIconName }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {name === 'heart' && (
                <path
                    d="M20.8 4.6 a5.5 5.5 0 0 0-7.8 0 L12 5.7 l-1.1-1.1 a5.5
                    5.5 0 0 0-7.8 7.8 L12 21 l8.8-8.6 a5.5 5.5 0 0 0 0-7.8
                    Z"
                />
            )}
            {name === 'comment' && (
                <path
                    d="M21 11.5 a9 9 0 0 1-9 9 9 9 0 0 1-4-.9 L3 21 l1.4-4.5
                    a9 9 0 1 1 16.6-5 Z"
                />
            )}
            {name === 'bookmark' && <path d="M6 3h12v18l-6-4-6 4Z" />}
            {name === 'down' && <path d="m6 9 6 6 6-6" />}
            {name === 'play' && (
                <>
                    <circle cx="12" cy="12" r="10" />
                    <path
                        d="m10 8 6 4-6 4Z"
                        fill="currentColor"
                        stroke="none"
                    />
                </>
            )}
            {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
        </svg>
    )
}

// 개별 클립 화면
function ClipCard({ clip, active }: { clip: Clip; active: boolean }) {
    // 영상 및 패널 참조
    const video = useRef<HTMLVideoElement>(null)
    const panel = useRef<HTMLDialogElement>(null)
    const comments = useRef<HTMLDialogElement>(null)

    // 반응 및 영상 재생 상태
    const [liked, setLiked] = useState(false)
    const [bookmarked, setBookmarked] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [failed, setFailed] = useState(false)
    const [tab, setTab] = useState<'note' | 'chapters'>('note')

    // 영상 사용 가능 여부와 현재 제작 구간
    const available = Boolean(clip.videoUrl) && !failed
    const chapterIndex = clip.chapters.reduce(
        (index, chapter, i) => currentTime >= chapter.time ? i : index,
        0
    )

    // 현재 화면의 영상만 재생 (자동 재생 제한 시 직접 재생 가능)
    useEffect(() => {
        const element = video.current
        if (!element) return
        if (active) {
            void element.play().catch(() => {})
        } else {
            element.pause()
        }
    }, [active, available])

    useEffect(() => {
        if (!active) {
            panel.current?.close()
            comments.current?.close()
        }
    }, [active])

    // 영상 재생 시점 이동
    function seek(time: number) {
        if (!video.current || !duration) return
        video.current.currentTime = Math.min(time, duration)
        setCurrentTime(video.current.currentTime)
    }

    // 모바일 작업 정보 열기
    function openPanel() {
        setTab('note')
        panel.current?.showModal()
    }

    // 작가 프로필 이미지
    const avatar = clip.author.avatarUrl ? (
        <img
            className="dc-avatar"
            src={clip.author.avatarUrl}
            alt=""
        />
    ) : (
        <span className="dc-avatar" aria-hidden="true">
            {clip.author.nickname.slice(0, 1)}
        </span>
    )

    // 작업 노트 및 색상칩
    const note = (
        <>
            <h2>작업 노트</h2>
            <p>{clip.note}</p>
            <div className="dc-colors" aria-label="사용 색상">
                {clip.colors.map(color => (
                    <span
                        key={color}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>
        </>
    )

    // 제작 과정과 영상 재생 시점 연결
    const chapters = (
        <div className="dc-chapters">
            {clip.chapters.map((chapter, index) => {
                const isCurrent = available && chapterIndex === index
                const isDisabled = !available || !duration || chapter.time > duration
                const color = clip.colors[index % clip.colors.length]

                return (
                    <button
                        key={chapter.time}
                        type="button"
                        className={`dc-chapter ${isCurrent ? 'is-current' : ''}`}
                        aria-current={isCurrent ? 'step' : undefined}
                        disabled={isDisabled}
                        onClick={() => seek(chapter.time)}
                    >
                        <span
                            className="dc-thumb"
                            style={{ backgroundColor: color }}
                        >
                            {chapter.thumbnailUrl && (
                                <img src={chapter.thumbnailUrl} alt="" />
                            )}
                        </span>
                        <span>
                            {formatTime(chapter.time)} {chapter.label}
                        </span>
                        <ClipIcon name="play" />
                    </button>
                )
            })}
        </div>
    )

    // 작가 ID를 기준으로 상세 페이지 연결 (기존 상세 라우트 확인 필요)
    const authorPath = `/artist/${encodeURIComponent(clip.author.id)}`
    const authorLink = (
        <Link className="dc-author" to={authorPath}>
            {avatar}
            <strong>{clip.author.nickname}</strong>
        </Link>
    )

    // 반응은 화면에서만 변경하며 DB에는 저장하지 않음
    const reactions = (
        <div className="dc-reactions" aria-label="클립 반응">
            <button
                type="button"
                className={liked ? 'is-liked' : ''}
                aria-label="좋아요"
                aria-pressed={liked}
                onClick={() => setLiked(previous => !previous)}
            >
                <ClipIcon name="heart" />
                <span>{clip.reactions.likes + Number(liked)}</span>
            </button>
            <button
                type="button"
                aria-label="댓글 보기"
                onClick={() => comments.current?.showModal()}
            >
                <ClipIcon name="comment" />
                <span>{clip.reactions.comments}</span>
            </button>
            <button
                type="button"
                className={bookmarked ? 'is-bookmarked' : ''}
                aria-label="북마크"
                aria-pressed={bookmarked}
                onClick={() => setBookmarked(previous => !previous)}
            >
                <ClipIcon name="bookmark" />
                <span>{clip.reactions.bookmarks + Number(bookmarked)}</span>
            </button>
        </div>
    )

    return (
        <article className="dc-card" aria-label={clip.title}>
            <div className="dc-layout">
                <aside className="dc-note">
                    {authorLink}
                    {note}
                </aside>
                <div className="dc-center">
                    <h1 className="dc-title">{clip.title}</h1>
                    <div className="dc-player">
                        {available ? (
                            <video
                                ref={video}
                                src={clip.videoUrl}
                                poster={clip.posterUrl}
                                controls
                                muted
                                playsInline
                                preload={active ? 'metadata' : 'none'}
                                onTimeUpdate={event => {
                                    setCurrentTime(event.currentTarget.currentTime)
                                }}
                                onLoadedMetadata={event => {
                                    const value = event.currentTarget.duration
                                    setDuration(Number.isFinite(value) ? value : 0)
                                }}
                                onError={() => setFailed(true)}
                            />
                        ) : (
                            <div className="dc-empty" role="status">
                                <ClipIcon name="play" />
                                <strong>
                                    {failed
                                        ? '영상을 불러올 수 없어요.'
                                        : '등록된 영상이 없어요.'}
                                </strong>
                                <small>영상 연결 후 재생할 수 있어요.</small>
                            </div>
                        )}
                        <div className="dc-mobile-author">
                            {authorLink}
                            <button
                                type="button"
                                onClick={openPanel}
                                aria-label="작업 정보 열기"
                            >
                                <ClipIcon name="down" />
                            </button>
                        </div>
                        <div className="dc-mobile-reactions">{reactions}</div>
                    </div>
                </div>
                <aside className="dc-process">
                    <h2>제작 과정</h2>
                    {chapters}
                    <div className="dc-desktop-reactions">{reactions}</div>
                </aside>
            </div>
            {/* 모바일 작업 정보 하단 패널 */}
            <dialog
                ref={panel}
                className="dc-panel"
                onClick={event => {
                    if (event.target === event.currentTarget) {
                        panel.current?.close()
                    }
                }}
            >
                <div className="dc-panel-inner">
                    <div className="dc-panel-tabs">
                        <button
                            type="button"
                            aria-pressed={tab === 'note'}
                            onClick={() => setTab('note')}
                        >
                            작업 노트
                        </button>
                        <button
                            type="button"
                            aria-pressed={tab === 'chapters'}
                            onClick={() => setTab('chapters')}
                        >
                            제작 과정
                        </button>
                        <button
                            className="dc-close"
                            type="button"
                            aria-label="닫기"
                            onClick={() => panel.current?.close()}
                        >
                            <ClipIcon name="close" />
                        </button>
                    </div>
                    {tab === 'note' ? note : chapters}
                </div>
            </dialog>
            <dialog ref={comments} className="dc-modal">
                <h2>댓글</h2>
                <p>댓글 조회 기능은 DB 연동 후 사용할 수 있어요.</p>
                <button type="button" onClick={() => comments.current?.close()}>
                    닫기
                </button>
            </dialog>
        </article>
    )
}

// 클립 목록 페이지
function ClipsPage() {
    const feed = useRef<HTMLDivElement>(null)
    const upload = useRef<HTMLDialogElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [height, setHeight] = useState<number>()

    // 기존 공통 헤더의 실제 높이에 맞춰 뷰어 높이 계산
    useEffect(() => {
        const header = document.querySelector('.header')
        const resize = () => {
            const headerHeight = header?.getBoundingClientRect().height ?? 0
            setHeight(Math.max(0, window.innerHeight - headerHeight))
        }
        resize()
        const observer = new ResizeObserver(resize)
        if (header) observer.observe(header)
        window.addEventListener('resize', resize)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', resize)
        }
    }, [])

    // 스크롤 위치에 따른 활성 클립 변경
    function handleScroll(event: UIEvent<HTMLDivElement>) {
        const element = event.currentTarget
        if (element.clientHeight) {
            const index = Math.round(element.scrollTop / element.clientHeight)
            setActiveIndex(Math.max(0, Math.min(clips.length - 1, index)))
        }
    }

    return (
        <main className="dc-page" style={{ height }}>
            <div className="dc-toolbar">
                <button type="button" onClick={() => upload.current?.showModal()}>
                    클립 올리기
                </button>
            </div>

            {/* 실제 업로드 연결 전 안내 창 */}
            <dialog ref={upload} className="dc-modal">
                <h2>클립 올리기</h2>
                <p>영상 등록 기능은 준비 중이에요.</p>
                <button type="button" onClick={() => upload.current?.close()}>
                    확인
                </button>
            </dialog>
            {/* 세로 스크롤 스냅 피드 */}
            <div
                className="dc-feed"
                ref={feed}
                onScroll={handleScroll}
                tabIndex={0}
                aria-label="도화 클립 목록"
            >
                {clips.length === 0 ? (
                    <div className="dc-feed-empty" role="status">
                        <ClipIcon name="play" />
                        <h2>아직 등록된 클립이 없어요.</h2>
                        <p>새로운 작업 영상을 기다려 주세요.</p>
                    </div>
                ) : (
                    clips.map((clip, index) => (
                        <ClipCard
                            key={clip.id}
                            clip={clip}
                            active={activeIndex === index}
                        />
                    ))
                )}
            </div>
        </main>
    )
}

export default ClipsPage
