import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Author, Post } from './communityTypes'
import { communityApi } from './communityApi'

// ⭐ 기존 Supabase 인증 상태 재사용
export function useCommunityUser() {
    const [user, setUser] = useState<string | null | undefined>(undefined)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user.id ?? null)
        })
        return () => subscription.unsubscribe()
    }, [])
    return user
}

export function AuthorLabel({ author }: { author: Author }) {
    return (
        <span className="dc-author">
            {/* 작가 상세 라우트 확정 후 연결 */}
            <Link to={`/artist?author=${encodeURIComponent(author.id)}`} className="dc-author">
                {author.avatarUrl && <img src={author.avatarUrl} alt="" />}
                {author.nickname}
            </Link>
        </span>
    )
}

// ⭐ 영상 호버 및 화면 이탈 제어
export function Preview({ post, playing }: { post: Post; playing?: boolean }) {
    const [hover, setHover] = useState(false)
    const [visible, setVisible] = useState(false)
    const [hidden, setHidden] = useState(document.hidden)
    const ref = useRef<HTMLVideoElement>(null)
    const media = post.media[0]
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
        if (ref.current) observer.observe(ref.current)
        const sync = () => setHidden(document.hidden)
        document.addEventListener('visibilitychange', sync)
        return () => {
            observer.disconnect()
            document.removeEventListener('visibilitychange', sync)
        }
    }, [media?.url])
    useEffect(() => {
        const video = ref.current
        if (!video) return
        if (visible && !hidden && (playing ?? hover)) void video.play().catch(() => {})
        else video.pause()
        return () => video.pause()
    }, [visible, hidden, playing, hover, media?.url])
    return (
        <div className="dc-preview" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {media?.type === 'video' ? (
                <video ref={ref} src={media.url} poster={media.poster} muted loop playsInline preload="metadata" />
            ) : media ? <img src={media.url} alt={post.title} loading="lazy" /> : <div className="dc-text-thumb">{post.title}</div>}
            {media?.type === 'video' && <span className="dc-tag">▶ {media.duration != null ? `${Math.floor(media.duration / 60)}:${String(Math.floor(media.duration % 60)).padStart(2, '0')}` : '영상'}</span>}
            {post.media.length > 1 && <span className="dc-count">+{post.media.length - 1}</span>}
        </div>
    )
}

export function Reactions({ post, user, notify }: { post: Post; user: string | null | undefined; notify: (text: string) => void }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [busy, setBusy] = useState(false)
    const action = async (name: string) => {
        if (user === undefined || busy) return
        if (!user) { navigate('/login'); return }
        setBusy(true)
        try { await communityApi.action(post.id, name) }
        catch (error) { notify(error instanceof Error ? error.message : '요청에 실패했어요.') }
        finally { setBusy(false) }
    }
    return (
        <div className="dc-actions">
            <span>조회 {post.views.toLocaleString('ko-KR')}</span>
            <button disabled={busy} aria-pressed={post.liked} onClick={() => void action('like')}>{post.liked ? '♥' : '♡'} {post.likes}</button>
            <Link to={`/community/${post.id}`} state={{ from: location.pathname === '/community' ? location.pathname + location.search : location.state?.from }} onClick={() => { if (location.pathname === '/community') sessionStorage.setItem(`dc-scroll:${location.search}`, String(window.scrollY)) }}>댓글 {post.commentCount}</Link>
            <button disabled={busy} aria-label="북마크" aria-pressed={post.bookmarked} onClick={() => void action('bookmark')}>{post.bookmarked ? '◆' : '◇'}</button>
        </div>
    )
}
