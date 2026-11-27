import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { episodeTitles } from './stageSamples'
import type { Story } from './stageSamples'

// ⭐ 작품 상세와 제작 미리보기에서 같은 화면 구성을 사용합니다.
export function StageDetailLayout({
    backTo,
    backLabel,
    title,
    summary,
    cover,
    label,
    children,
}: {
    backTo: string
    backLabel: string
    title: string
    summary: string
    cover?: string
    label: string
    children?: ReactNode
}) {
    return (
        <article className="stage-detail">
            <Link to={backTo}>‹ {backLabel}</Link>
            <div className="stage-detail-intro">
                {cover && (
                    <img
                        src={cover}
                        alt=""
                    />
                )}
                <div>
                    <p className="stage-detail-label">{label}</p>
                    <h1>{title}</h1>
                    <p className="stage-summary">{summary}</p>
                </div>
            </div>
            {children}
        </article>
    )
}

// ⭐ 작품 상세, 회차 미리보기, 없는 작품 안내를 표시합니다.
export default function StageDetailPage({
    story,
    episode,
    listUrl,
    getDetailUrl,
}: {
    story?: Story
    episode: number
    listUrl: string
    getDetailUrl: (id: number, episode?: number) => string
}) {
    const episodeTitle = Number.isInteger(episode) ? episodeTitles[episode - 1] : undefined

    if (story && episodeTitle) {
        return (
            <StageDetailLayout
                backTo={getDetailUrl(story.id)}
                backLabel="작품 상세"
                title={`${episode}화. ${episodeTitle}`}
                label={story.title}
                summary={story.summary}
            >
                <p className="stage-episode-note">회차 미리보기</p>
            </StageDetailLayout>
        )
    }

    if (story) {
        return (
            <StageDetailLayout
                backTo={listUrl}
                backLabel="작품 목록"
                title={story.title}
                label={story.genre}
                summary={story.summary}
                cover={story.cover}
            >
                <ol className="stage-episodes">
                    {episodeTitles.map((title, index) => {
                        const number = index + 1

                        return (
                            <li key={title}>
                                <Link to={getDetailUrl(story.id, number)}>
                                    {number}화. {title}
                                </Link>
                            </li>
                        )
                    })}
                </ol>
            </StageDetailLayout>
        )
    }

    return (
        <StageDetailLayout
            backTo={listUrl}
            backLabel="작품 목록"
            title="작품을 찾을 수 없어요."
            label="도화 스테이지"
            summary="작품 목록에서 다른 이야기를 골라 보세요."
        />
    )
}
