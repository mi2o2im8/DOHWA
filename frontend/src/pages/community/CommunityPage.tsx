// 커뮤니티 화면 컴포넌트
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { categories } from './communityTypes'
import type { Category, HotIssue, Post } from './communityTypes'
import { communityApi } from './communityApi'
import { AuthorLabel, Preview, Reactions, useCommunityUser } from './communityParts'
import './CommunityPage.css'

// ⭐ TODAY'S HOT 자동 전환 및 화면 밖 재생 정지
function HotBanner({ issues, from, rememberScroll }: { issues: HotIssue[]; from: string; rememberScroll: () => void }) {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
    const [hover, setHover] = useState(false)
    const [visible, setVisible] = useState(false)
    const [hidden, setHidden] = useState(document.hidden)
    const hero = useRef<HTMLElement>(null)
    const issue = issues[index % Math.max(issues.length, 1)]
    const playing = visible && !paused && !hover && !hidden

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
        if (hero.current) observer.observe(hero.current)
        const sync = () => setHidden(document.hidden)
        document.addEventListener('visibilitychange', sync)
        return () => {
            observer.disconnect()
            document.removeEventListener('visibilitychange', sync)
        }
    }, [])

    useEffect(() => {
        if (!playing || issues.length < 2) return
        const timer = window.setInterval(() => {
            setIndex(value => (value + 1) % issues.length)
        }, 8500)
        return () => window.clearInterval(timer)
    }, [playing, issues.length, index])

    const shift = (offset: number) => {
        if (issues.length) setIndex(value => (value + offset + issues.length) % issues.length)
    }

    return (
        <section
            ref={hero}
            className="dc-hero"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="dc-hero-inner">
                <div className="dc-copy" key={issue?.id ?? 'empty'}>
                    <small>TODAY'S HOT {issue && ` / ${index + 1} · ${issue.name}`}</small>
                    <h1>{issue?.title ?? '오늘도 어떤 창작을\n하고 있나요?'}</h1>
                    <p>{issue?.description ?? '등록된 HOT 이슈가 아직 없어요.'}</p>
                    <div className="dc-controls">
                        <button disabled={!issue} onClick={() => shift(-1)} aria-label="이전 이슈">〈</button>
                        {issues.map((item, i) => (
                            <button
                                key={item.id}
                                className={`dc-dot ${i === index ? 'on' : ''}`}
                                aria-label={`이슈 ${i + 1}`}
                                aria-pressed={i === index}
                                onClick={() => setIndex(i)}
                            />
                        ))}
                        <button disabled={!issue} onClick={() => shift(1)} aria-label="다음 이슈">〉</button>
                        <button
                            disabled={!issue}
                            onClick={() => setPaused(!paused)}
                            aria-label={paused ? '자동 전환 재생' : '자동 전환 일시정지'}
                        >{paused ? '▶' : 'Ⅱ'}</button>
                    </div>
                </div>
                <div className="dc-collage" key={issue?.id ?? 'empty'}>
                    <div className="dc-paper" />
                    {issue?.posts.slice(0, 3).map((post, i) => (
                        <Link key={post.id} to={`/community/${post.id}`} state={{ from }} onClick={rememberScroll} className={`dc-print dc-print-${i}`}>
                            <Preview post={post} playing={playing} />
                        </Link>
                    ))}
                    {!issue && <div className="dc-hot-empty">작품을 기다리고 있어요.</div>}
                    {issue?.posts[0] && (
                        <div className="dc-note">
                            <small>Today's Pick</small>
                            <strong>{issue.posts[0].title}</strong>
                            <small>{issue.posts[0].author.nickname}</small>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default function CommunityPage() {
    // 검색 및 정렬 상태를 URL에 유지
    const [params, setParams] = useSearchParams()
    const location = useLocation()
    const navigate = useNavigate()
    const user = useCommunityUser()
    const category = categories.find(item => item === params.get('category')) ?? '전체'
    const search = params.get('q') ?? ''
    const sort = params.get('sort') ?? 'latest'
    const mode = params.get('mode') ?? (['질문ㆍ피드백', '자유 게시판'].includes(category) ? 'list' : 'grid')
    const page = Math.max(1, Number(params.get('page')) || 1)
    const [posts, setPosts] = useState<Post[]>([])
    const [issues, setIssues] = useState<HotIssue[]>([])
    const [status, setStatus] = useState('loading')
    const [hotError, setHotError] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [notice, setNotice] = useState('')
    const [retry, setRetry] = useState(0)
    const root = useRef<HTMLDivElement>(null)
    const restored = useRef(false)

    // 기존 공통 헤더 높이에 맞춰 카테고리 위치 조정
    useEffect(() => {
        const header = document.querySelector('.header')
        if (!header) return
        const sync = () => root.current?.style.setProperty('--dc-header', `${header.getBoundingClientRect().height}px`)
        const observer = new ResizeObserver(sync)
        observer.observe(header)
        sync()
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        let active = true
        communityApi.hot().then(data => {
            if (active) setIssues(data)
        }).catch(() => { if (active) setHotError(true) })
        return () => { active = false }
    }, [])

    useEffect(() => {
        let active = true
        setStatus('loading')
        communityApi.list({ category, search, sort, page }).then(data => {
            if (!active) return
            setPosts(data.posts)
            setHasMore(data.hasMore)
            setStatus('ready')
        }).catch(() => { if (active) setStatus('error') })
        return () => { active = false }
    }, [category, search, sort, page, retry])

    useEffect(() => {
        if (status !== 'ready' || restored.current) return
        restored.current = true
        const y = Number(sessionStorage.getItem(`dc-scroll:${location.search}`) ?? 0)
        requestAnimationFrame(() => window.scrollTo(0, y))
    }, [status, location.search])

    const update = (key: string, value: string) => {
        const next = new URLSearchParams(params)
        next.set(key, value)
        if (key !== 'page') next.delete('page')
        if (key === 'category') next.delete('mode')
        setParams(next, { replace: true })
    }

    const rememberScroll = () => sessionStorage.setItem(`dc-scroll:${location.search}`, String(window.scrollY))
    const write = () => {
        rememberScroll()
        navigate(user ? '/community/write' : '/login', { state: { from: `/community${location.search}` } })
    }

    return (
        <div className="dc" ref={root}>
            <HotBanner issues={issues} from={location.pathname + location.search} rememberScroll={rememberScroll} />
            {hotError && <p role="status">HOT 이슈를 불러오지 못했어요.</p>}
            <main className="dc-content">
                <div className="dc-heading">
                    <div><h2>커뮤니티</h2><small>창작의 모든 순간을 함께 나눠요.</small></div>
                    <button className="dc-primary" disabled={user === undefined} onClick={write}>＋ 글쓰기</button>
                </div>
                <nav className="dc-categories" aria-label="커뮤니티 카테고리">
                    {categories.map((item: Category) => (
                        <button key={item} className={category === item ? 'on' : ''} aria-pressed={category === item} onClick={() => update('category', item)}>{item}</button>
                    ))}
                </nav>
                <div className="dc-tools">
                    <input type="search" value={search} placeholder="제목, 내용, 작가 검색" aria-label="게시글 검색" onChange={event => update('q', event.target.value)} />
                    <span className="dc-spacer" />
                    <select value={sort} aria-label="정렬" onChange={event => update('sort', event.target.value)}>
                        <option value="latest">최신순</option>
                        <option value="popular">인기순</option>
                        <option value="views">조회수순</option>
                    </select>
                    <button className={mode === 'grid' ? 'on' : ''} aria-label="갤러리 보기" onClick={() => update('mode', 'grid')}>▦</button>
                    <button className={mode === 'list' ? 'on' : ''} aria-label="목록 보기" onClick={() => update('mode', 'list')}>☰</button>
                </div>
                {notice && <p role="status">{notice}</p>}
                <div className={`dc-feed ${mode === 'list' ? 'dc-list' : ''}`}>
                    {status === 'loading' && <p className="dc-empty">불러오는 중...</p>}
                    {status === 'error' && <div className="dc-empty">게시글을 불러오지 못했어요. <button onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>}
                    {status === 'ready' && !posts.length && <p className="dc-empty">표시할 게시글이 없어요.</p>}
                    {status === 'ready' && posts.map(post => (
                        <article key={post.id} className="dc-post">
                            <Link className="dc-thumb" to={`/community/${post.id}`} state={{ from: location.pathname + location.search }} onClick={rememberScroll}>
                                <Preview post={post} />
                            </Link>
                            <div>
                                <Link className="dc-title" to={`/community/${post.id}`} state={{ from: location.pathname + location.search }} onClick={rememberScroll}>{post.title}</Link>
                                <AuthorLabel author={post.author} />
                                <small>{post.category} · {new Date(post.createdAt).toLocaleString('ko-KR')}</small>
                            </div>
                            <Reactions post={post} user={user} notify={setNotice} />
                        </article>
                    ))}
                </div>
                {(hasMore || page > 1) && (
                    <div className="dc-pagination">
                        <button disabled={page === 1} onClick={() => update('page', String(page - 1))}>이전</button>
                        <span>{page} 페이지</span>
                        <button disabled={!hasMore} onClick={() => update('page', String(page + 1))}>다음</button>
                    </div>
                )}
            </main>
        </div>
    )
}
