import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
    findPublicVirtual,
    listRelatedVirtuals,
} from './publicVirtualSamples'
import type { PublicVirtual } from './publicVirtualSamples'
import './VirtualDetailPage.css'

const numberFormat = new Intl.NumberFormat('ko-KR')

function VirtualDetail({ work }: { work: PublicVirtual }) {
    const video = useRef<HTMLVideoElement>(null)
    const [playing, setPlaying] = useState(false)
    const [videoError, setVideoError] = useState(false)
    const [liked, setLiked] = useState(false)
    const [previewId, setPreviewId] = useState(work.previews[1]?.id ?? work.previews[0]?.id)
    const preview = work.previews.find((item) => item.id === previewId)
    const relatedWorks = listRelatedVirtuals(work)

    async function togglePlayback() {
        const player = video.current
        if (!player) return

        if (!player.paused) {
            player.pause()
            return
        }

        try {
            await player.play()
        } catch {
            setPlaying(false)
        }
    }

    return (
        <>
            <div className="virtual-detail-layout">
                {/* 작가가 공개한 버추얼 영상 */}
                <section className="virtual-detail-screen" aria-label="버추얼 재생 화면">
                    <video
                        ref={video}
                        src={work.videoUrl}
                        poster={work.posterUrl}
                        autoPlay
                        muted
                        loop
                        playsInline
                        disablePictureInPicture
                        disableRemotePlayback
                        onContextMenu={(event) => event.preventDefault()}
                        onPlaying={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onError={() => {
                            setVideoError(true)
                            setPlaying(false)
                        }}
                    />
                    {videoError ? (
                        <p className="virtual-detail-video-error" role="status">
                            재생 영상을 불러올 수 없어요.
                        </p>
                    ) : (
                        <button
                            className="virtual-detail-play"
                            type="button"
                            onClick={togglePlayback}
                            aria-label={playing ? '일시정지' : '재생'}
                        >
                            <span aria-hidden="true">
                                <span
                                    className={playing ? 'virtual-detail-pause-icon' : 'virtual-detail-play-icon'}
                                />
                            </span>
                        </button>
                    )}
                </section>

                <div className="virtual-detail-side">
                    {/* 작품 정보와 작가 프로필 */}
                    <section aria-labelledby="virtual-detail-title">
                        <h1 id="virtual-detail-title">{work.title}</h1>
                        <div className="virtual-detail-stats">
                            {/* 샘플 좋아요 상태. 실제 연결 시 작품별 사용자 좋아요 API 사용 */}
                            <button
                                className="virtual-detail-like"
                                type="button"
                                aria-pressed={liked}
                                onClick={() => setLiked((previous) => !previous)}
                            >
                                <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
                                좋아요 {numberFormat.format(work.likeCount + Number(liked))}
                            </button>
                            <span className="virtual-detail-views">
                                <span className="virtual-detail-eye" aria-hidden="true" />
                                조회수 {numberFormat.format(work.viewCount)}
                            </span>
                        </div>
                        <div className="virtual-detail-artist">
                            <img src={work.artist.avatarUrl} alt="" />
                            <div>
                                <strong>{work.artist.name}</strong>
                                <p>{work.artist.bio}</p>
                            </div>
                        </div>
                    </section>

                    {/* 썸네일 선택과 인라인 미리보기 */}
                    {preview && (
                        <section
                            className="virtual-detail-previews"
                            aria-labelledby="virtual-detail-preview-title"
                        >
                            <h2 id="virtual-detail-preview-title">작가가 올린 미리보기</h2>
                            <div className="virtual-detail-thumbs">
                                {work.previews.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        aria-label={item.kind === 'gif' ? `${item.label} GIF` : item.label}
                                        aria-controls="virtual-detail-selected"
                                        aria-pressed={item.id === preview.id}
                                        onClick={() => setPreviewId(item.id)}
                                    >
                                        <img src={item.thumbnailUrl} alt="" />
                                        {item.kind === 'gif' && <span aria-hidden="true">GIF</span>}
                                    </button>
                                ))}
                            </div>
                            <div
                                id="virtual-detail-selected"
                                className="virtual-detail-preview"
                                aria-live="polite"
                            >
                                <img key={preview.id} src={preview.mediaUrl} alt={preview.label} />
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* 작가의 다른 공개 작품 */}
            {relatedWorks.length > 0 && (
                <section className="virtual-detail-related" aria-labelledby="virtual-detail-related-title">
                    <h2 id="virtual-detail-related-title">이 작가의 다른 버추얼</h2>
                    <div className="virtual-detail-cards">
                        {relatedWorks.map((item) => (
                            <Link key={item.id} to={`/virtual/${encodeURIComponent(item.id)}`}>
                                <img src={item.posterUrl} alt="" loading="lazy" />
                                <span>{item.title}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </>
    )
}

export default function VirtualDetailPage() {
    const { virtualId } = useParams()
    const work = findPublicVirtual(virtualId)

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [virtualId])

    return (
        <main className="virtual-detail">
            {/* 공통 헤더 아래 갤러리로 돌아가는 링크 */}
            <Link className="virtual-detail-back" to="/virtual">
                <span aria-hidden="true">←</span> 버추얼 갤러리
            </Link>
            {work ? (
                <VirtualDetail key={work.id} work={work} />
            ) : (
                <h1 id="virtual-detail-title">공개된 버추얼 작품을 찾을 수 없어요.</h1>
            )}
        </main>
    )
}
