import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { categories } from './communityTypes'
import type { Media, Post } from './communityTypes'
import { communityApi } from './communityApi'
import { useCommunityUser } from './communityParts'
import './CommunityPage.css'
import './CommunityWritePage.css'

type Attachment = { key: string; source: File | Media; url: string; video: boolean }

// ⭐ 작성 및 수정 공통 폼
export default function CommunityWritePage() {
    const { postId } = useParams()
    const user = useCommunityUser()
    const navigate = useNavigate()
    const location = useLocation()
    const [category, setCategory] = useState<Post['category']>('일러스트')
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [status, setStatus] = useState(postId ? 'loading' : 'ready')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)
    const lock = useRef(false)
    const urls = useRef(new Set<string>())
    const from = typeof location.state?.from === 'string' && location.state.from.startsWith('/community') ? location.state.from : '/community'
    const cancel = postId ? `/community/${postId}` : from

    useEffect(() => {
        const created = urls.current
        return () => { created.forEach(url => URL.revokeObjectURL(url)); created.clear() }
    }, [])

    useEffect(() => {
        if (!postId || !user) return
        let active = true
        setStatus('loading')
        communityApi.detail(postId).then(post => {
            if (!active) return
            if (!post || post.author.id !== user) { setStatus('denied'); return }
            setCategory(post.category)
            setTitle(post.title)
            setBody(post.body)
            setAttachments(post.media.map(media => ({ key: media.id, source: media, url: media.url, video: media.type === 'video' })))
            setStatus('ready')
        }).catch(() => { if (active) setStatus('error') })
        return () => { active = false }
    }, [postId, user])

    const addFiles = (files: FileList | null) => {
        const additions: Attachment[] = []
        for (const file of Array.from(files ?? [])) {
            if (!/^(image|video)\//.test(file.type)) { setNotice('이미지 또는 동영상만 첨부할 수 있어요.'); continue }
            const url = URL.createObjectURL(file)
            urls.current.add(url)
            additions.push({ key: url, source: file, url, video: file.type.startsWith('video/') })
        }
        setAttachments(items => [...items, ...additions])
    }

    const remove = (item: Attachment) => {
        if (urls.current.delete(item.url)) URL.revokeObjectURL(item.url)
        setAttachments(items => items.filter(entry => entry.key !== item.key))
    }

    const move = (index: number, offset: number) => {
        setAttachments(items => {
            const next = [...items]
            const target = index + offset
            if (target < 0 || target >= next.length) return items
            const [item] = next.splice(index, 1)
            next.splice(target, 0, item)
            return next
        })
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (lock.current || !user || status !== 'ready') return
        if (!title.trim() || !body.trim()) { setNotice('제목과 내용을 입력해 주세요.'); return }
        lock.current = true
        setBusy(true)
        try {
            const id = await communityApi.save({ category, title: title.trim(), body: body.trim(), attachments: attachments.map(item => item.source) }, postId)
            navigate(`/community/${id}`, { replace: true, state: { from } })
        } catch (error) { setNotice(error instanceof Error ? error.message : '저장하지 못했어요.') }
        finally { lock.current = false; setBusy(false) }
    }

    if (user === undefined) return <main className="dc dc-write">로그인 확인 중...</main>
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
    return (
        <main className="dc dc-write">
            <Link to={cancel} state={{ from }}>← 돌아가기</Link>
            <h1>{postId ? '게시글 수정' : '게시글 작성'}</h1>
            {status !== 'ready' ? <p>{status === 'loading' ? '불러오는 중...' : status === 'denied' ? '게시글이 없거나 수정 권한이 없어요.' : '게시글을 불러오지 못했어요.'}</p> : (
                <form className="dc-form" onSubmit={submit}>
                    <label>카테고리
                        <select value={category} onChange={event => setCategory(event.target.value as Post['category'])}>
                            {categories.slice(1).map(item => <option key={item}>{item}</option>)}
                        </select>
                    </label>
                    <label>제목<input required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} /></label>
                    <label>내용<textarea required value={body} onChange={event => setBody(event.target.value)} /></label>
                    <label>이미지 및 동영상 첨부<input type="file" accept="image/*,video/*" multiple onChange={event => { addFiles(event.target.files); event.target.value = '' }} /></label>
                    <div className="dc-attachments">
                        {attachments.map((item, index) => (
                            <div key={item.key}>
                                {item.video ? <video src={item.url} controls playsInline /> : <img src={item.url} alt={`첨부 ${index + 1}`} />}
                                <div className="dc-controls">
                                    <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>앞으로</button>
                                    <button type="button" disabled={index === attachments.length - 1} onClick={() => move(index, 1)}>뒤로</button>
                                    <button type="button" onClick={() => remove(item)}>삭제</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p role="status">{notice || '현재 DB 미연결 상태로 실제 등록 및 수정은 지원하지 않아요.'}</p>
                    <div className="dc-end">
                        <Link to={cancel} state={{ from }}>작성 취소</Link>
                        <button className="dc-primary" disabled={busy}>{busy ? '처리 중...' : postId ? '수정하기' : '등록하기'}</button>
                    </div>
                </form>
            )}
        </main>
    )
}
