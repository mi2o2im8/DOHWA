import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { communityApi } from './communityApi'
import { AuthorLabel, Reactions, useCommunityUser } from './communityParts'
import type { Comment, Post } from './communityTypes'
import './CommunityPage.css'
import './CommunityDetailPage.css'

// ⭐ 상세 페이지 진입 및 댓글 처리
export default function CommunityDetailPage() {
    const { postId = '' } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const user = useCommunityUser()
    const [post, setPost] = useState<Post | null>(null)
    const [comments, setComments] = useState<Comment[]>([])
    const [status, setStatus] = useState('loading')
    const [notice, setNotice] = useState('')
    const [body, setBody] = useState('')
    const [reply, setReply] = useState<string>()
    const [busy, setBusy] = useState(false)
    const viewed = useRef('')
    const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/community') ? location.state.from : '/community'

    useEffect(() => {
        let active = true
        setStatus('loading')
        window.scrollTo(0, 0)
        Promise.all([communityApi.detail(postId), communityApi.comments(postId)]).then(([data, replies]) => {
            if (!active) return
            setPost(data)
            setComments(replies)
            setStatus('ready')
            if (data && viewed.current !== postId) {
                viewed.current = postId
                void communityApi.view(postId).catch(() => setNotice('조회수를 반영하지 못했어요.'))
            }
        }).catch(() => { if (active) setStatus('error') })
        return () => { active = false }
    }, [postId])

    const act = async (name: string, payload?: unknown) => {
        if (busy || user === undefined) return
        if (!user) { navigate('/login'); return }
        setBusy(true)
        try { await communityApi.action(postId, name, payload) }
        catch (error) { setNotice(error instanceof Error ? error.message : '요청에 실패했어요.') }
        finally { setBusy(false) }
    }

    const own = Boolean(user && post?.author.id === user)
    return (
        <main className="dc dc-detail">
            <Link className="dc-back" to={from}>← 커뮤니티 목록</Link>
            {status === 'loading' && <p>불러오는 중...</p>}
            {status === 'error' && <p>게시글 조회에 실패했어요.</p>}
            {status === 'ready' && !post && <p>표시할 게시글이 없어요. 아직 데이터가 연결되지 않았을 수 있어요.</p>}
            {status === 'ready' && post && (
                <article>
                    <small className="dc-category-label">{post.category}</small>
                    <h1>{post.title}</h1>
                    <div className="dc-detail-author">
                        <AuthorLabel author={post.author} />
                        <small>{new Date(post.createdAt).toLocaleString('ko-KR')}</small>
                        {own && <Link to={`/community/${post.id}/edit`} state={{ from }}>수정</Link>}
                        {own && <button disabled={busy} onClick={() => { if (confirm('게시글을 삭제할까요?')) void act('delete') }}>삭제</button>}
                        <button disabled={busy} onClick={() => { const reason = prompt('신고 사유를 입력해 주세요.'); if (reason?.trim()) void act('report', { reason }) }}>신고</button>
                    </div>
                    <p className="dc-body">{post.body}</p>
                    {post.media.map(media => media.type === 'image' ? (
                        <img key={media.id} className="dc-detail-media" src={media.url} alt={post.title} />
                    ) : (
                        <video key={media.id} className="dc-detail-media" src={media.url} poster={media.poster} controls playsInline />
                    ))}
                    <Reactions post={post} user={user} notify={setNotice} />
                    <section className="dc-comments">
                        <h3>댓글 {post.commentCount}</h3>
                        {comments.map(comment => (
                            <div className={`dc-comment ${comment.parentId ? 'dc-reply' : ''}`} key={comment.id}>
                                <AuthorLabel author={comment.author} />
                                <p>{comment.body}</p>
                                <button onClick={() => setReply(comment.id)}>답글</button>
                            </div>
                        ))}
                        {reply && <button onClick={() => setReply(undefined)}>답글 취소</button>}
                        <form className="dc-comment-form" onSubmit={event => { event.preventDefault(); if (body.trim()) void act('comment', { body: body.trim(), parentId: reply }) }}>
                            <input required value={body} onChange={event => setBody(event.target.value)} placeholder={reply ? '답글을 남겨주세요' : '댓글을 남겨주세요'} aria-label="댓글" />
                            <button className="dc-primary" disabled={busy || user === undefined}>등록</button>
                        </form>
                    </section>
                </article>
            )}
            <p role="status">{notice}</p>
            <div className="dc-end"><Link to={from}>목록으로 돌아가기</Link></div>
        </main>
    )
}
