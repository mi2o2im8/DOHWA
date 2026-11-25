import { Link, useSearchParams } from 'react-router'
import { listPublicVirtuals, virtualGallerySorts } from './publicVirtualSamples'
import { useEffect, useRef, useState } from 'react'
import './VirtualGalleryPage.css'

export default function VirtualGalleryPage() {
    // 검색어와 정렬을 URL에 저장해 뒤로가기 시 복원
    const [searchParams, setSearchParams] = useSearchParams()
    // 검색창 입력값과 URL에 반영된 검색어를 따로 관리
    const savedQuery = searchParams.get('q') ?? ''
    const [query, setQuery] = useState(savedQuery)
    const isComposing = useRef(false)

    useEffect(() => {
        // 뒤로가기로 갤러리에 돌아오면 URL의 검색어 복원
        if (!isComposing.current) {
            setQuery(savedQuery)
        }
    }, [savedQuery])
    const sort = virtualGallerySorts.find(
        ({ value }) => value === searchParams.get('sort'),
    ) ?? virtualGallerySorts[0]

    const works = listPublicVirtuals(query, sort.value)

    function updateFilter(name: 'q' | 'sort', value: string) {
        const next = new URLSearchParams(searchParams)

        if (value) {
            next.set(name, value)
        } else {
            next.delete(name)
        }

        setSearchParams(next, { replace: true, preventScrollReset: true })
    }

    return (
        <main className="virtual-gallery">
            {/* 갤러리 제목과 기존 제작 경로 */}
            <div className="virtual-gallery-heading">
                <h1>버추얼 갤러리</h1>
                <Link to="/virtual/create">마이 버추얼 만들기</Link>
            </div>

            {/* 작품명·작가명 검색과 결과 정렬 */}
            <div className="virtual-gallery-filters">
                <label>
                    <span>작품 검색</span>
                    <input
                        type="search"
                        value={query}
                        placeholder="작품명 또는 작가명"
                        onCompositionStart={() => {
                            isComposing.current = true
                        }}
                        onCompositionEnd={(event) => {
                            const value = event.currentTarget.value

                            isComposing.current = false
                            setQuery(value)
                            updateFilter('q', value)
                        }}
                        onChange={(event) => {
                            const value = event.currentTarget.value
                            setQuery(value)

                            if (!isComposing.current) {
                                updateFilter('q', value)
                            }
                        }}
                    />
                </label>

                <label>
                    <span>정렬</span>
                    <select
                        value={sort.value}
                        onChange={(event) => updateFilter('sort', event.target.value)}
                    >
                        {virtualGallerySorts.map(({ value, label }) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {works.length === 0 && (
                <p className="virtual-gallery-empty" role="status">
                    검색 결과가 없어요.
                </p>
            )}

            {/* 카드에서 작품별 공개 상세 페이지로 이동 */}
            <ul className="virtual-gallery-cards">
                {works.map((work) => (
                    <li key={work.id}>
                        <Link to={`/virtual/${encodeURIComponent(work.id)}`}>
                            <img src={work.posterUrl} alt="" />
                            <strong>{work.title}</strong>
                            <span>{work.artist.name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    )
}