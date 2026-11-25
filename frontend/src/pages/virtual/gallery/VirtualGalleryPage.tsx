import { Link } from 'react-router'
import { listPublicVirtuals } from './publicVirtualSamples'
import './VirtualGalleryPage.css'

export default function VirtualGalleryPage() {
    const works = listPublicVirtuals()

    return (
        <main className="virtual-gallery">
            {/* 갤러리 제목과 기존 제작 경로 */}
            <div className="virtual-gallery-heading">
                <h1>버추얼 갤러리</h1>
                <Link to="/virtual/create">마이 버추얼 만들기</Link>
            </div>

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
