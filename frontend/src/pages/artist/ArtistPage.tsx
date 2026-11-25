import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { artistFilters, artistSamples, filterKeys } from './artistSamples'
import type { Artist } from './artistSamples'
import './ArtistPage.css'

const FOLLOW_STORAGE_KEY = 'dohwa.artistFollows'

function readFollowedArtists(): string[] {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(FOLLOW_STORAGE_KEY) ?? '[]')
        return Array.isArray(stored)
            ? stored.filter((id): id is string => typeof id === 'string')
            : []
    } catch {
        return []
    }
}

function ArtistIntro({ artist, listSearch }: { artist: Artist; listSearch?: string }) {
    // 샘플 팔로우 상태를 이 브라우저에 저장
    const [followedIds, setFollowedIds] = useState(readFollowedArtists)
    const followed = followedIds.includes(artist.id)

    function toggleFollow() {
        const next = followed
            ? followedIds.filter((id) => id !== artist.id)
            : [...followedIds, artist.id]

        setFollowedIds(next)
        try {
            localStorage.setItem(FOLLOW_STORAGE_KEY, JSON.stringify(next))
        } catch {
            // 저장소 접근이 제한되어도 현재 화면에는 선택을 표시
        }
    }

    return (
        <div className="artist-intro">
            {listSearch === undefined ? (
                <h1>{artist.name}</h1>
            ) : (
                <h2>
                    <Link to={{ pathname: `/artist/${artist.id}`, search: listSearch }}>
                        {artist.name} <span aria-hidden="true">↗</span>
                    </Link>
                </h2>
            )}

            <ul className="artist-tags" aria-label="작가 태그">
                {artist.tags.map((tag) => <li key={tag}>#{tag}</li>)}
            </ul>
            <p className="artist-bio">{artist.bio}</p>

            <div className="artist-follow">
                <p aria-live="polite">팔로워 {artist.followers + Number(followed)}</p>
                <button type="button" aria-pressed={followed} onClick={toggleFollow}>
                    <span aria-hidden="true">{followed ? '♥' : '♡'}</span>
                    {followed ? '팔로잉' : '팔로우'}
                </button>
            </div>
        </div>
    )
}

function ArtistWorks({ artist }: { artist: Artist }) {
    return (
        <div className={`artist-works artist-works--${artist.works.length}`} aria-label="작품">
            {artist.works.map((work) => (
                <img key={work.src} src={work.src} alt={work.title} />
            ))}
        </div>
    )
}

export default function ArtistPage() {
    // 검색어와 필터를 URL에 저장해 상세에서 돌아와도 복원
    const [params, setParams] = useSearchParams()
    const query = params.get('q') ?? ''
    const normalizedQuery = query.trim().toLowerCase()
    const matches = artistSamples.filter((artist) => {
        const terms = [artist.name, ...filterKeys.flatMap((key) => artist.categories[key])]
        const matchesQuery = normalizedQuery.split(/\s+/).every((word) =>
            terms.some((term) => term.toLowerCase().includes(word)),
        )
        return matchesQuery && filterKeys.every((key) => {
            const selected = params.get(key) ?? ''
            return !artistFilters[key].options.includes(selected) ||
                artist.categories[key].includes(selected)
        })
    })

    function updateParam(key: string, value: string, replace = false) {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        setParams(next, { replace })
    }

    return (
        <main className="artist-page">
            <div className="artist-heading">
                <h1>취향이 닮은 작가를 만나보세요</h1>
                <div className="artist-search" role="search">
                    <input
                        type="search"
                        aria-label="작가 이름, 분야, 그림체, 분위기 검색"
                        placeholder="작가 이름 · 분야 검색"
                        value={query}
                        onChange={(event) => updateParam('q', event.target.value, true)}
                    />
                    <span aria-hidden="true" />
                </div>
            </div>

            <div className="artist-filters" aria-label="작가 필터">
                {filterKeys.map((key) => {
                    const { label, options } = artistFilters[key]
                    const value = params.get(key) ?? ''
                    const selected = options.includes(value) ? value : ''

                    return (
                        <div className="artist-filter-group" role="group" aria-label={label} key={key}>
                            <span className="artist-filter-label">{label}</span>
                            <div className="artist-filter-options">
                                {['', ...options].map((option) => (
                                    <button
                                        type="button"
                                        key={option}
                                        aria-pressed={selected === option}
                                        onClick={() => updateParam(key, option)}
                                    >
                                        {option || '전체'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            <section className="artist-list" aria-label="작가 목록">
                {matches.map((artist) => (
                    <article className="artist-card" key={artist.id}>
                        <ArtistIntro artist={artist} listSearch={params.toString()} />
                        <ArtistWorks artist={artist} />
                    </article>
                ))}
                {matches.length === 0 && (
                    <div className="artist-empty">
                        <p role="status">조건에 맞는 작가가 없어요.</p>
                        <button type="button" onClick={() => setParams({})}>검색과 필터 초기화</button>
                    </div>
                )}
            </section>
        </main>
    )
}

export function ArtistDetailPage() {
    const { artistId } = useParams()
    const [params] = useSearchParams()
    const artist = artistSamples.find((item) => item.id === artistId)

    return (
        <main className="artist-page">
            <Link className="artist-back" to={{ pathname: '/artist', search: params.toString() }}>
                ← 작가 찾기
            </Link>
            {artist ? (
                <article className="artist-card artist-card--detail">
                    <ArtistIntro key={artist.id} artist={artist} />
                    <ArtistWorks artist={artist} />
                </article>
            ) : (
                <h1 className="artist-missing">작가를 찾을 수 없어요.</h1>
            )}
        </main>
    )
}
