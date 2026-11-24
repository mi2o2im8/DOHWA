import { useState } from 'react'
import { Link } from 'react-router'
import './VirtualGalleryPage.css'

type VirtualArtwork = {
    id: string
    title: string
    artist: string
    thumbnailUrl: string
    publishedAt: string
    likeCount: number
}

type SortOrder = 'recent' | 'popular'

const sortOptions: { value: SortOrder; label: string }[] = [
    { value: 'recent', label: '최신순' },
    { value: 'popular', label: '인기순' },
]

// ⭐ 공개 작품 목록을 받으면 전시 카드와 정렬에 함께 사용한다.
export default function VirtualGalleryPage({ artworks = [] }: { artworks?: readonly VirtualArtwork[] }) {
    const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
    const sortedArtworks = [...artworks].sort((first, second) => {
        const newestFirst = Date.parse(second.publishedAt) - Date.parse(first.publishedAt)
        if (sortOrder === 'recent') return newestFirst
        return second.likeCount - first.likeCount || newestFirst
    })

    return (
        <main className="virtual-gallery">
            <header className="virtual-gallery-header">
                <div>
                    <h1>버추얼 갤러리</h1>
                    <p>작가들이 공개한 마이 버추얼을 감상해 보세요.</p>
                </div>
                <Link className="virtual-gallery-create" to="/virtual/create">마이 버추얼 만들기</Link>
            </header>

            <div className="virtual-gallery-sort" role="group" aria-label="작품 정렬">
                {sortOptions.map(({ value, label }) => (
                    <button key={value} type="button" aria-pressed={sortOrder === value}
                        onClick={() => setSortOrder(value)}>
                        {label}
                    </button>
                ))}
            </div>

            {sortedArtworks.length === 0 ? (
                <p className="virtual-gallery-empty">아직 전시된 버추얼이 없어요.</p>
            ) : (
                <ul className="virtual-gallery-grid" aria-label="공개 버추얼 작품">
                    {sortedArtworks.map((artwork) => (
                        <li key={artwork.id}>
                            <figure className="virtual-gallery-card">
                                <div className="virtual-gallery-frame">
                                    <img src={artwork.thumbnailUrl} alt={artwork.title} loading="lazy" />
                                </div>
                                <figcaption>
                                    <strong>{artwork.title}</strong>
                                    <span>{artwork.artist}</span>
                                    <span>좋아요 {artwork.likeCount.toLocaleString('ko-KR')}</span>
                                </figcaption>
                            </figure>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}
