// 커뮤니티 화면 컴포넌트
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { categories } from './communityTypes'
import type { Category, HotIssue, Post } from './communityTypes'
import { communityApi } from './communityApi'
import { AuthorLabel, Preview, Reactions, useCommunityUser } from './communityParts'
import './CommunityPage.css'

// HOT 배너에 필요한 게시글 및 목록 복원 정보
interface HotBannerProps {
    issues: HotIssue[]
    from: string
    rememberScroll: () => void
}

// v5 콜라주와 자동 전환, 영상 재생 상태 관리
function HotBanner({
    issues,
    from,
    rememberScroll,
}: HotBannerProps) {
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(() => {
        return matchMedia('(prefers-reduced-motion: reduce)')
            .matches
    })
    const [hover, setHover] = useState(false)
    const [visible, setVisible] = useState(false)
    const [hidden, setHidden] = useState(document.hidden)
    const hero = useRef<HTMLDivElement>(null)
    const activeIndex = index % Math.max(issues.length, 1)
    const issue = issues[activeIndex]
    const playing = visible && !paused && !hover && !hidden
    const canShift = issues.length > 1
    const title = issue?.title ??
        '오늘도 어떤 창작을\n하고 있나요?'

    // 화면 이탈 및 브라우저 탭 전환 감지
    useEffect(() => {
        // 헤더 뒤로 가려진 HOT 영역은 재생 대상에서 제외
        const observer = new IntersectionObserver(([entry]) => {
            setVisible(entry.intersectionRatio >= 0.15)
        }, { threshold: 0.15 })
        if (hero.current) observer.observe(hero.current)
        const sync = () => setHidden(document.hidden)
        document.addEventListener('visibilitychange', sync)
        return () => {
            observer.disconnect()
            document.removeEventListener('visibilitychange', sync)
        }
    }, [])

    // 8.5초마다 이슈 전환, 호버 또는 일시정지 시 중단
    useEffect(() => {
        if (!playing || !canShift) return
        const timer = window.setInterval(() => {
            setIndex(value => (value + 1) % issues.length)
        }, 8500)
        return () => window.clearInterval(timer)
    }, [playing, canShift, issues.length, activeIndex])

    // 이전 및 다음 이슈 이동
    const shift = (offset: number) => {
        if (!canShift) return
        setIndex(value => {
            return (value + offset + issues.length) % issues.length
        })
    }

    // 빈 슬롯은 디자인만 표시하고 실제 게시글만 이동 허용
    const frames = [0, 1, 2]
    return (
        <div
            ref={hero}
            className="dc-hero"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <div className="dc-hero-inner">
                {/* HOT 제목 및 전환 제어 */}
                <div
                    className="dc-copy"
                    key={issue?.id ?? 'empty'}
                >
                    <small>
                        TODAY'S HOT
                        {issue && ` / ${activeIndex + 1} · ${issue.name}`}
                    </small>
                    <h1>{title}</h1>
                    <p>
                        {issue?.description ??
                            '등록된 HOT 이슈가 아직 없어요.'}
                    </p>
                    <div
                        className="dc-controls"
                        hidden={!issue}
                    >
                        <button
                            type="button"
                            disabled={!canShift}
                            onClick={() => shift(-1)}
                            aria-label="이전 이슈"
                        >

                            〈

                        </button>
                        {issues.map((item, i) => (
                            <button
                                key={item.id}
                                type="button"
                                className={i === activeIndex
                                    ? 'dc-dot on' : 'dc-dot'}
                                aria-label={`이슈 ${i + 1}`}
                                aria-pressed={i === activeIndex}
                                onClick={() => setIndex(i)}
                            />
                        ))}
                        <button
                            type="button"
                            disabled={!canShift}
                            onClick={() => shift(1)}
                            aria-label="다음 이슈"
                        >

                            〉

                        </button>
                        <button
                            type="button"
                            onClick={() => setPaused(value => !value)}
                            aria-label={paused
                                ? '자동 전환 재생' : '자동 전환 일시정지'}
                        >
                            {paused ? '▶' : 'Ⅱ'}
                        </button>
                    </div>
                </div>

                {/* 겹쳐진 액자별 실제 게시글 상세 이동 */}
                <div
                    className="dc-collage"
                    key={issue?.id ?? 'empty'}
                >
                    <div
                        className="dc-paper"
                        aria-hidden="true"
                    />
                    {frames.map(i => {
                        const post = issue?.posts[i]
                        const frameClass = `dc-print dc-print-${i}`
                        if (!post) {
                            return (
                                <div
                                    key={i}
                                    className={`${frameClass} dc-print-empty`}
                                    aria-hidden="true"
                                />
                            )
                        }
                        return (
                            <Link
                                key={`${i}-${post.id}`}
                                to={`/community/${post.id}`}
                                state={{ from }}
                                onClick={rememberScroll}
                                className={frameClass}
                                aria-label={`${post.title} 게시글 보기`}
                            >
                                <Preview
                                    post={post}
                                    playing={playing}
                                />
                            </Link>
                        )
                    })}
                    {/* 메모지는 클릭을 가로채지 않음 */}
                    <div className="dc-note">
                        <small>Today's Pick</small>
                        <strong>
                            {issue?.posts[0]?.title ?? '작품을 기다려요'}
                        </strong>
                        <small>
                            {issue?.posts[0]?.author.nickname ??
                                'HOT 작품이 여기에 표시돼요.'}
                        </small>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CommunityPage() {
    // 검색 및 정렬 상태를 URL에 유지
    const [params, setParams] = useSearchParams()
    const location = useLocation()
    const navigate = useNavigate()
    const user = useCommunityUser()
    const category = categories.find(
        item => item === params.get('category')
    ) ?? '전체'
    const search = params.get('q') ?? ''
    const sort = params.get('sort') ?? 'latest'
    const isTextCategory = ['질문ㆍ피드백', '자유 게시판'].includes(category)
    const defaultMode = isTextCategory ? 'list' : 'grid'
    const mode = params.get('mode') ?? defaultMode
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

    // 공통 헤더 높이와 카테고리 고정 위치 동기화
    useEffect(() => {
        const header = document.querySelector('.header') ??
            document.querySelector('header')
        const pageRoot = root.current
        if (!header || !pageRoot) return

        const sync = () => {
            const height = header.getBoundingClientRect().height
            pageRoot.style.setProperty('--dc-header', `${height}px`)
        }
        const observer = new ResizeObserver(sync)
        observer.observe(header)
        sync()
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        let active = true
        setStatus('loading')
        communityApi.list({ category, search, sort, page }).then(data => {
            if (!active) return
            setPosts(data.posts)
            setHasMore(data.hasMore)
            setStatus('ready')
        }).catch(() => {
            if (active) setStatus('error')
        })
        return () => {
            active = false
        }
    }, [category, search, sort, page, retry])

    // HOT 이슈 조회 (목록 검색 조건과 별도로 관리)
    useEffect(() => {
        let active = true
        setHotError(false)
        communityApi.hot()
            .then(data => {
                if (active) setIssues(data)
            })
            .catch(() => {
                if (active) setHotError(true)
            })
        return () => {
            active = false
        }
    }, [])

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

    const from = location.pathname + location.search

    // 목록 위치 저장 및 글쓰기 이동
    const rememberScroll = () => {
        sessionStorage.setItem(
            `dc-scroll:${location.search}`,
            String(window.scrollY)
        )
    }
    const write = () => {
        if (user === undefined) {
            setNotice("로그인 상태를 확인 중이에요.")
            return
        }
        rememberScroll()
        const destination = user ? '/community/write' : '/login'
        navigate(destination, { state: { from } })
    }

    return (
        <div
            className="dc dc-community-page"
            ref={root}
        >
            {/* HOT 이슈 배너 */}
            <HotBanner
                issues={issues}
                from={from}
                rememberScroll={rememberScroll}
            />
            {hotError && <p role="status">HOT 이슈를 불러오지 못했어요.</p>}
            <div
                className="dc-content"
                role="main"
            >
                {/* 커뮤니티 제목 및 글쓰기 */}
                <div className="dc-heading">
                    <div>
                        <h2>커뮤니티</h2>
                        <small>창작의 모든 순간을 함께 나눠요.</small>
                    </div>
                    <button
                        className="dc-primary"
                        onClick={write}
                    >
                        ＋ 글쓰기
                    </button>
                </div>
                {/* 카테고리 메뉴 */}
                <div
                    role="navigation"
                    className="dc-categories"
                    aria-label="커뮤니티 카테고리"
                >
                    {categories.map((item: Category) => (
                        <button
                            key={item}
                            className={category === item ? 'on' : ''}
                            aria-pressed={category === item}
                            onClick={() => update('category', item)}
                        >
                            {item}
                        </button>
                    ))}
                </div>
                {/* 검색, 정렬 및 보기 방식 */}
                <div className="dc-tools">
                    <input
                        type="search"
                        value={search}
                        placeholder="제목, 내용, 작가 검색"
                        aria-label="게시글 검색"
                        onChange={event => update('q', event.target.value)}
                    />
                    <span className="dc-spacer" />
                    <select
                        value={sort}
                        aria-label="정렬"
                        onChange={event => update('sort', event.target.value)}
                    >
                        <option value="latest">최신순</option>
                        <option value="popular">인기순</option>
                        <option value="views">조회수순</option>
                    </select>
                    <button
                        className={mode === 'grid' ? 'on' : ''}
                        aria-label="갤러리 보기"
                        onClick={() => update('mode', 'grid')}
                    >
                        ▦
                    </button>
                    <button
                        className={mode === 'list' ? 'on' : ''}
                        aria-label="목록 보기"
                        onClick={() => update('mode', 'list')}
                    >
                        ☰
                    </button>
                </div>
                {notice && <p role="status">{notice}</p>}
                {/* 게시글 목록 및 조회 상태 */}
                <div className={`dc-feed ${mode === 'list' ? 'dc-list' : ''}`}>
                    {status === 'loading' && <p className="dc-empty">불러오는 중...</p>}
                    {status === 'error' && (
                        <div className="dc-empty">
                            <p>게시글을 불러오지 못했어요.</p>
                            <button onClick={() => setRetry(value => value + 1)}>
                                다시 시도
                            </button>
                        </div>
                    )}
                    {status === 'ready' && !posts.length && <div className="dc-empty">
                        <p>표시할 게시글이 없어요.</p>
                        <button
                            className="dc-primary"
                            onClick={write}
                        >
                            첫 게시글 작성하기
                        </button>
                    </div>}
                    {status === 'ready' && posts.map(post => (
                        <article
                            key={post.id}
                            className="dc-post"
                        >
                            <Link
                                className="dc-thumb"
                                to={`/community/${post.id}`}
                                state={{ from }}
                                onClick={rememberScroll}
                            >
                                <Preview post={post} />
                            </Link>
                            <div>
                                <Link
                                    className="dc-title"
                                    to={`/community/${post.id}`}
                                    state={{ from }}
                                    onClick={rememberScroll}
                                >
                                    {post.title}
                                </Link>
                                <AuthorLabel author={post.author} />
                                <small>
                                    {post.category} · {new Date(post.createdAt).toLocaleString('ko-KR')}
                                </small>
                            </div>
                            <Reactions
                                post={post}
                                user={user}
                                notify={setNotice}
                            />
                        </article>
                    ))}
                </div>
                {(hasMore || page > 1) && (
                    <div className="dc-pagination">
                        <button
                            disabled={page === 1}
                            onClick={() => update('page', String(page - 1))}
                        >
                            이전
                        </button>
                        <span>{page} 페이지</span>
                        <button
                            disabled={!hasMore}
                            onClick={() => update('page', String(page + 1))}
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
