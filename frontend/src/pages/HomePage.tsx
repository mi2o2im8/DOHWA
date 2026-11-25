// 도화 메인 홈

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import './HomePage.css'

// 이미지 불러오기
// home-artwork 폴더의 WebP 파일을 화면에서 쓸 이미지 주소로 가져온다.
const artwork = import.meta.glob<string>('./home-artwork/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})

// 작업방 카드에 표시할 샘플 데이터
const rooms = [
  { title: '여름 빛과 색, 함께 그려요', description: '햇살이 드는 오후 작업실' },
  { title: '도시의 저녁, 감성 일러스트', description: '밤의 크로키 모임' },
  { title: '나만의 작업 공간 그리기', description: '느긋한 그림 라운지' },
]

// 홈에 보여줄 도화 클립 2개의 샘플 데이터
const clips = [
  { title: '판타지 배경 일러스트, 이렇게 그려요', creator: '소라비' },
  { title: '빛과 분위기로 그리는 인물 일러스트', creator: '나유' },
]

// 작가 갤러리 타일 6개의 이름과 분야
const artists = [
  ['수채', '일러스트'],
  ['연두', '캐릭터'],
  ['복숭아', '디지털 드로잉'],
  ['수채', '배경'],
  ['연두', '크로키'],
  ['복숭아', '작업 일기'],
]

// 창작자들의 이야기 카드 5개의 샘플 데이터
const stories = [
  { title: '오후의 빛을 담아봤어요', category: '그림 공유', creator: '수채' },
  { title: '캐릭터 작업 과정, 함께 봐요', category: '작업 과정', creator: '연두' },
  { title: '이 색 조합은 어떤가요?', category: '질문 / 피드백', creator: '복숭아' },
  { title: '작업실 창가에서 그린 풍경', category: '그림 공유', creator: '수채' },
  { title: '밤 장면의 색감을 고민 중이에요', category: '질문 / 피드백', creator: '연두' },
]

function HomePage() {
  // 작업방 카드가 보이는 영역과 실제로 이동하는 카드 줄
  const roomViewport = useRef<HTMLDivElement>(null)
  const roomTrack = useRef<HTMLDivElement>(null)
  // 작가 갤러리 전체 영역과 좌우로 움직이는 위·아래 작품 줄
  const artistGallery = useRef<HTMLElement>(null)
  const firstArtistRow = useRef<HTMLDivElement>(null)
  const secondArtistRow = useRef<HTMLDivElement>(null)
  // 자동 이동 정지 여부를 애니메이션과 버튼 문구에 각각 반영한다.
  const roomPaused = useRef(false)
  const [paused, setPaused] = useState(false)

  // 작업방은 세로 스크롤과 독립적으로 움직이며, 호버하거나 끌면 정지한다.
  useEffect(() => {
    const viewport = roomViewport.current
    const track = roomTrack.current
    const group = track?.firstElementChild
    if (!viewport || !track || !group) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function updateMotionPreference() {
      roomPaused.current = motion.matches
      setPaused(motion.matches)
    }

    roomPaused.current = motion.matches
    const events = new AbortController()
    const options = { signal: events.signal }
    let groupWidth = 0
    let offset = 0
    let frame = 0
    let lastTime = 0
    let suppressClick = false
    let pointer: { id: number; x: number; offset: number; dragging: boolean } | undefined

    function paint() {
      if (!track || groupWidth <= 0) return
      const position = ((offset % groupWidth) + groupWidth) % groupWidth
      track.style.transform = `translate3d(-${position}px, 0, 0)`
    }

    const resize = new ResizeObserver(() => {
      groupWidth = group.getBoundingClientRect().width
      paint()
    })
    resize.observe(group)

    function animate(time: number) {
      if (
        lastTime && !roomPaused.current && !pointer
        && !viewport?.matches(':hover') && !viewport?.querySelector(':focus-visible')
      ) {
        offset += Math.min(time - lastTime, 40) * 0.027
        paint()
      }
      lastTime = time
      frame = window.requestAnimationFrame(animate)
    }

    motion.addEventListener('change', updateMotionPreference, options)
    const preferenceFrame = window.requestAnimationFrame(updateMotionPreference)

    // 누른 위치를 기록하고 6px 이상 움직이면 카드 드래그를 시작한다.
    viewport.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return
      suppressClick = false
      pointer = { id: event.pointerId, x: event.clientX, offset, dragging: false }
    }, options)

    window.addEventListener('pointermove', event => {
      if (!pointer || pointer.id !== event.pointerId) return
      const distance = event.clientX - pointer.x
      if (!pointer.dragging && Math.abs(distance) < 6) return
      if (!pointer.dragging) {
        pointer.dragging = true
        suppressClick = true
        viewport.setPointerCapture(event.pointerId)
        viewport.classList.add('is-dragging')
      }
      offset = pointer.offset - distance
      paint()
    }, options)

    function finish(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId) return
      pointer = undefined
      viewport?.classList.remove('is-dragging')
    }

    window.addEventListener('pointerup', finish, options)
    window.addEventListener('pointercancel', finish, options)
    viewport.addEventListener('lostpointercapture', finish, options)
    viewport.addEventListener('dragstart', event => event.preventDefault(), options)
    viewport.addEventListener('click', event => {
      if (!suppressClick || event.detail === 0) return
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
    }, { ...options, capture: true })
    viewport.addEventListener('focusin', event => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) return
      offset = Math.max(
        0,
        event.target.getBoundingClientRect().right
          - track.getBoundingClientRect().left
          - viewport.clientWidth
          + 12,
      )
      paint()
    }, options)

    frame = window.requestAnimationFrame(animate)
    return () => {
      events.abort()
      resize.disconnect()
      window.cancelAnimationFrame(preferenceFrame)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  // 페이지를 내리면 갤러리의 두 줄이 서로 반대 방향으로 이동한다.
  useEffect(() => {
    const gallery = artistGallery.current
    const rows = [firstArtistRow.current, secondArtistRow.current]
    if (!gallery) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    function update() {
      frame = 0
      if (motion.matches || gallery?.contains(document.activeElement)) return
      const bounds = gallery?.getBoundingClientRect()
      if (!bounds) return
      const viewport = document.documentElement.clientHeight
      const progress = Math.max(0, Math.min(1, (viewport - bounds.top) / (viewport + bounds.height)))

      rows.forEach((row, index) => {
        if (!row) return
        const travel = row.scrollWidth - row.clientWidth
        row.scrollLeft = travel * (index === 0 ? progress : 1 - progress)
      })
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', schedule)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      motion.removeEventListener('change', schedule)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <main className="dohwa-home">
      {/* 작업방 소개와 작업방 전체 보기 */}
      <section className="dohwa-home__content" aria-labelledby="home-rooms-title">
        <div className="dohwa-home__heading">
          <div>
            <h1 id="home-rooms-title">지금, <em>같이</em> 그릴까요?</h1>
            <p>도화의 작업실에서 작가들과 함께 창작하고 영감을 나누세요.</p>
          </div>
          <Link to="/rooms">작업방 전체 보기 →</Link>
        </div>

        {/* 같은 카드 묶음을 두 번 이어 붙여 자동 이동이 끊기지 않게 한다. */}
        <div className="dohwa-home__room-viewport" ref={roomViewport}>
          <div className="dohwa-home__room-track" ref={roomTrack}>
            {[false, true].map(duplicate => (
              <div
                className="dohwa-home__room-group"
                key={String(duplicate)}
                aria-hidden={duplicate || undefined}
              >
                {rooms.map((room, index) => (
                  <article className="dohwa-home__room" key={room.title}>
                    <img
                      src={artwork[`./home-artwork/rooms-${index + 1}.webp`]}
                      alt=""
                      draggable={false}
                    />
                    <div className="dohwa-home__room-body">
                      <span className="dohwa-home__tag">작업실</span>
                      <h2>{room.title}</h2>
                      <div className="dohwa-home__room-footer">
                        <span>{room.description}</span>
                        <Link to="/rooms" tabIndex={duplicate ? -1 : undefined}>둘러보기</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 작업방 카드 자동 이동 정지·재생 버튼 */}
        <div className="dohwa-home__controls">
          <button type="button" onClick={() => {
            roomPaused.current = !paused
            setPaused(!paused)
          }}>
            {paused ? '자동 이동 재생' : '자동 이동 멈추기'}
          </button>
        </div>
      </section>

      <div className="dohwa-home__content dohwa-home__discovery">
        {/* 왼쪽 영역에 표시하는 도화 클립 미리보기 2개 */}
        <section aria-labelledby="home-clips-title">
          <div className="dohwa-home__heading">
            <div>
              <h2 id="home-clips-title">도화 클립</h2>
              <p>그리는 과정과 작가의 이야기를 짧은 영상으로 만나보세요.</p>
            </div>
            <Link to="/clip">클립 전체 보기 →</Link>
          </div>
          <div className="dohwa-home__clips">
            {clips.map((clip, index) => (
              <Link to="/clip" className="dohwa-home__clip" key={clip.title}>
                <div className="dohwa-home__clip-image">
                  <img
                    src={artwork[`./home-artwork/clips-${index + 1}.webp`]}
                    alt=""
                    loading="lazy"
                  />
                  <span aria-hidden="true">▶</span>
                </div>
                <strong>{clip.title}</strong>
                <small>{clip.creator}</small>
              </Link>
            ))}
          </div>
        </section>

        {/* 오른쪽 버추얼 소개 카드와 제작 화면으로 가는 버튼 */}
        <section className="dohwa-home__virtual" aria-labelledby="home-virtual-title">
          <img
            src={artwork['./home-artwork/virtual-1.webp']}
            alt=""
            loading="lazy"
          />
          <div>
            <h2 id="home-virtual-title">
              나만의 버추얼 캐릭터로
              <br />
              창작 활동을 더 특별하게
            </h2>
            <p>내 그림으로 움직이는 캐릭터를 만들어 보세요.</p>
            <Link to="/virtual/create">마이 버추얼 제작하기 →</Link>
          </div>
        </section>
      </div>

      {/* 스크롤에 따라 반대 방향으로 움직이는 작가 갤러리 */}
      <section className="dohwa-home__gallery" ref={artistGallery} aria-labelledby="home-gallery-title">
        <div className="dohwa-home__content dohwa-home__heading">
          <div>
            <h2 id="home-gallery-title">작가 갤러리</h2>
            <p>도화의 작가들이 만든 일러스트를 감상해 보세요.</p>
          </div>
          <Link to="/artist">작가 둘러보기 →</Link>
        </div>

      
        {/* 한 줄에 작품 3개씩 배치하며, 마우스를 올렸을 때의 효과는 CSS에서 처리한다. */}
        {[firstArtistRow, secondArtistRow].map((row, rowIndex) => (
          <div className="dohwa-home__artist-row" ref={row} key={rowIndex}>
            {artists.slice(rowIndex * 3, rowIndex * 3 + 3).map(([name, field], index) => (
              <Link to="/artist" className="dohwa-home__artist-tile" key={name}>
                <div className="dohwa-home__artist-image">
                  <img
                    src={artwork[`./home-artwork/gallery-${rowIndex * 3 + index + 1}.webp`]}
                    alt=""
                    loading="lazy"
                  />
                </div>
                <div className="dohwa-home__artist-caption">
                  <strong>{name}</strong>
                  <small>{field}</small>
                  <span aria-hidden="true">↗</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </section>

      {/* 창작자들의 이야기 카드 5개와 커뮤니티 이동 링크 */}
      <section className="dohwa-home__content" aria-labelledby="home-stories-title">
        <div className="dohwa-home__heading">
          <div>
            <h2 id="home-stories-title">창작자들의 이야기</h2>
            <p>작은 질문도, 오늘 완성한 그림도 편하게 나눠요.</p>
          </div>
          <Link to="/community">커뮤니티 전체 보기 →</Link>
        </div>
        <div className="dohwa-home__stories">
          {stories.map((story, index) => (
            <Link to="/community" className="dohwa-home__story" key={story.title}>
              <img
                src={artwork[`./home-artwork/gallery-${index + 1}.webp`]}
                alt=""
                loading="lazy"
              />
              <div>
                <span className="dohwa-home__tag">{story.category}</span>
                <h3>{story.title}</h3>
                <small>{story.creator}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 하단 비주얼노벨 소개와 스토리 페이지 이동 링크 */}
      <section className="dohwa-home__content dohwa-home__novel" aria-labelledby="home-novel-title">
        <div className="dohwa-home__heading">
          <div>
            <h2 id="home-novel-title">캐릭터와 이어가는 이야기</h2>
            <p>내 캐릭터와 대사, 선택지로 만드는 작은 비주얼노벨.</p>
          </div>
          <Link to="/story">스토리 둘러보기 →</Link>
        </div>
        <div className="dohwa-home__novel-banner">
          <h3>비 오는 날의 아틀리에</h3>
          <p>당신의 선택으로 달라지는 세 가지 이야기를 만나보세요.</p>
          <Link to="/story">이야기 시작하기 →</Link>
        </div>
      </section>
    </main>
  )
}

export default HomePage