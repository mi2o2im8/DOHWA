// 미연시

import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
    episodeTitles,
    freshStories,
    hotStories,
    newStoriesCategory,
    recommendedSections,
    stories,
    storyCategories,
    tailoredStories,
} from './stageSamples'
import type { Story } from './stageSamples'
import StageDetailPage, { StageDetailLayout } from './StageDetailPage'
import './StagePage.css'

type Draft = { title: string; summary: string }
type Reading = { storyId: number; episode: number }

const exampleReading = { storyId: 1, episode: 4 }
const readingKey = 'dohwa.story.reading'
const draftKey = 'dohwa.story.draft'

function readSession(key: string): unknown {
    try {
        return JSON.parse(sessionStorage.getItem(key) ?? 'null')
    } catch {
        return null
    }
}

function saveSession(key: string, value: Draft | Reading) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
        // 현재 화면에서는 React 상태로 입력값과 읽던 회차를 유지합니다.
    }
}

function getDraft(): Draft {
    const draft = readSession(draftKey) as Partial<Draft> | null

    return {
        title: typeof draft?.title === 'string' ? draft.title : '',
        summary: typeof draft?.summary === 'string' ? draft.summary : '',
    }
}

function getReading(): Reading {
    const reading = readSession(readingKey) as Reading | null

    if (
        reading
        && stories.some((story) => story.id === reading.storyId)
        && Number.isInteger(reading.episode)
        && reading.episode >= 1
        && reading.episode <= episodeTitles.length
    ) {
        return reading
    }

    return exampleReading
}

// ⭐ 기존 /story 경로에서 목록과 개별 화면의 주소를 구성합니다.
function storyUrl(category: string, screen: Record<string, string> = {}) {
    const params = new URLSearchParams(screen)

    if (category !== '베스트') {
        params.set('category', category)
    }

    const query = params.toString()
    return query ? `/story?${query}` : '/story'
}

function detailUrl(category: string, id: number, episode?: number) {
    const screen: Record<string, string> = { work: String(id) }

    if (episode) {
        screen.episode = String(episode)
    }

    return storyUrl(category, screen)
}

function TicketSection({
    title,
    items,
    category,
    moreCategory,
    compact = false,
}: {
    title: string
    items: Story[]
    category: string
    moreCategory?: string
    compact?: boolean
}) {
    return (
        <section className="stage-section">
            <div className="stage-section-heading">
                <h2>{title}</h2>
                {moreCategory && (
                    <Link
                        to={storyUrl(moreCategory)}
                        aria-label={`${title} 더보기`}
                    >
                        더보기 ›
                    </Link>
                )}
            </div>

            <div className={compact ? 'stage-tickets stage-tickets-compact' : 'stage-tickets'}>
                {items.map((story) => (
                    <Link
                        key={story.id}
                        className="stage-ticket"
                        to={detailUrl(category, story.id)}
                    >
                        <img
                            src={story.cover}
                            alt=""
                        />
                        <div className="stage-ticket-text">
                            <strong>{story.title}</strong>
                            <small>{story.genre}</small>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}

function StagePage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const page = useRef<HTMLElement>(null)
    const sticky = useRef<HTMLDivElement>(null)
    const [draft, setDraft] = useState(getDraft)
    const [reading, setReading] = useState(getReading)
    const [draftError, setDraftError] = useState('')

    const requestedCategory = params.get('category')
    const category = [...storyCategories, newStoriesCategory]
        .find((item) => item === requestedCategory) ?? '베스트'
    const work = params.get('work')
    const view = params.get('view')
    const story = stories.find((item) => String(item.id) === work)
    const episode = Number(params.get('episode'))
    const episodeTitle = Number.isInteger(episode) ? episodeTitles[episode - 1] : undefined
    const resumeStory = stories.find((item) => item.id === reading.storyId)
    const listUrl = storyUrl(category)
    const editorUrl = storyUrl(category, { view: 'create' })

    // ⭐ 공통 헤더의 실제 높이와 크기 변경을 sticky 오프셋에 반영합니다.
    useLayoutEffect(() => {
        const stage = page.current
        const header = stage?.previousElementSibling

        if (!stage || !(header instanceof HTMLElement) || !header.matches('header.header')) {
            return
        }

        const syncHeight = () => {
            stage.style.setProperty('--stage-header-height', `${header.getBoundingClientRect().height}px`)
        }

        syncHeight()
        const observer = new ResizeObserver(syncHeight)
        observer.observe(header)

        return () => observer.disconnect()
    }, [])

    // 목록 진입 및 뒤로가기에서도 선택한 노선을 같은 위치에서 보여줍니다.
    useLayoutEffect(() => {
        const navigation = sticky.current

        if (!navigation || category === '베스트') {
            window.scrollTo(0, 0)
            return
        }

        const bannerBottom = navigation.previousElementSibling?.getBoundingClientRect().bottom

        if (bannerBottom !== undefined) {
            const headerHeight = page.current?.previousElementSibling?.getBoundingClientRect().height ?? 0
            window.scrollTo(0, window.scrollY + bannerBottom - headerHeight)
        }
        const route = navigation.querySelector<HTMLElement>('.stage-route')
        const active = route?.querySelector<HTMLElement>('[aria-current="page"]')

        if (route && active) {
            route.scrollLeft = active.offsetLeft - (route.clientWidth - active.offsetWidth) / 2
        }
    }, [category, view, work, episode])

    function submitDraft(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const cleaned = { title: draft.title.trim(), summary: draft.summary.trim() }

        if (!cleaned.title || !cleaned.summary) {
            setDraftError('작품 제목과 소개를 입력해 주세요.')
            return
        }

        setDraftError('')
        setDraft(cleaned)
        saveSession(draftKey, cleaned)
        navigate(storyUrl(category, { view: 'preview' }))
    }

    // ⭐ 상세, 회차, 제작과 미리보기는 각각 독립된 화면으로 렌더링합니다.
    let content: ReactNode

    if (work) {
        content = (
            <StageDetailPage
                story={story}
                episode={episode}
                listUrl={listUrl}
                getDetailUrl={(id, selectedEpisode) => detailUrl(category, id, selectedEpisode)}
            />
        )
    } else if (view === 'create') {
        content = (
            <article className="stage-detail">
                <Link to={listUrl}>‹ 작품 목록</Link>
                <h1>마이 버추얼 스토리 제작</h1>
                <form
                    className="stage-form"
                    onSubmit={submitDraft}
                >
                    <label>
                        작품 제목
                        <input
                            value={draft.title}
                            maxLength={60}
                            required
                            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                        />
                    </label>
                    <label>
                        작품 소개
                        <textarea
                            value={draft.summary}
                            rows={5}
                            required
                            onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                        />
                    </label>
                    {draftError && <p role="alert">{draftError}</p>}
                    <button
                        className="stage-button"
                        type="submit"
                    >
                        작품 상세 미리보기
                    </button>
                </form>
            </article>
        )
    } else if (view === 'preview') {
        content = (
            <StageDetailLayout
                backTo={editorUrl}
                backLabel="제작 화면으로"
                title={draft.title || '작품 상세 미리보기'}
                label="작품 상세 미리보기"
                summary={draft.summary || '제작 화면에서 작품 제목과 소개를 입력해 주세요.'}
            />
        )
    } else {
        const categoryStories = category === newStoriesCategory
            ? freshStories
            : category === '취향저격'
                ? tailoredStories
                : stories.filter((item) => item.genre === category)

        content = (
            <>
                <div className="stage-hero">
                    <div>
                        <h1>도화 스테이지</h1>
                        <p>오늘은 어떤 이야기 속으로 떠나볼까요?</p>
                    </div>
                    {resumeStory && (
                        <Link
                            className="stage-resume"
                            to={detailUrl(category, resumeStory.id, reading.episode)}
                        >
                            <strong>{resumeStory.title} · {reading.episode}화</strong>
                            <span>이어보기 →</span>
                        </Link>
                    )}
                </div>

                <div
                    ref={sticky}
                    className="stage-sticky"
                >
                    <div className="stage-hot">
                        <h2>HOT <span>지금 가장 많이 읽는 이야기</span></h2>
                        {hotStories.map((item, index) => (
                            <Link
                                key={item.id}
                                className="stage-hot-work"
                                to={detailUrl(category, item.id)}
                            >
                                <span className="stage-hot-rank">{index + 1}</span>
                                <img
                                    src={`/story-hot-${index + 1}.webp`}
                                    alt=""
                                />
                                <strong>{item.title}</strong>
                            </Link>
                        ))}
                        <Link
                            className="stage-button"
                            to={editorUrl}
                        >
                            + 마이 버추얼 스토리 제작
                        </Link>
                    </div>

                    <nav
                        className="stage-route"
                        aria-label="스토리 카테고리 노선도"
                    >
                        {storyCategories.map((item) => (
                            <Link
                                key={item}
                                to={storyUrl(item)}
                                aria-current={category === item ? 'page' : undefined}
                            >
                                {item}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="stage-catalog">
                    {category === '베스트' ? (
                        recommendedSections.map((section) => (
                            <TicketSection
                                key={section.title}
                                title={section.title}
                                items={section.stories}
                                category={category}
                                moreCategory={section.category}
                                compact={section.category === newStoriesCategory}
                            />
                        ))
                    ) : (
                        <TicketSection
                            title={category}
                            items={categoryStories}
                            category={category}
                            compact={category === newStoriesCategory}
                        />
                    )}
                </div>
            </>
        )
    }

    useLayoutEffect(() => {
        if (!story || !episodeTitle) {
            return
        }

        const record = { storyId: story.id, episode }
        saveSession(readingKey, record)

        // 회차의 주소로 바로 접속한 경우에도 이어보기에 반영합니다.
        const frame = requestAnimationFrame(() => setReading(record))
        return () => cancelAnimationFrame(frame)
    }, [story, episode, episodeTitle])

    return (
        <main
            ref={page}
            className="story-stage"
        >
            {content}
        </main>
    )
}

export default StagePage
