// ⭐ 공개 상세 응답에 사용하는 필드
type PublicPreview = {
    id: string
    label: string
    kind: 'image' | 'gif'
    thumbnailUrl: string
    mediaUrl: string
}

export type PublicVirtual = {
    id: string
    title: string
    likeCount: number
    viewCount: number
    videoUrl: string
    posterUrl: string
    artist: {
        id: string
        name: string
        bio: string
        avatarUrl: string
    }
    previews: readonly PublicPreview[]
}

const media = (file: string) => `${import.meta.env.BASE_URL}virtual-demo/${file}`

// ⭐ 공개 작품 샘플
const artist = {
    id: 'seoon',
    name: '서온',
    bio: '밤마다 달빛을 모아 그림을 그려요.',
    avatarUrl: media('avatar.webp'),
}

const sampleWorks: readonly PublicVirtual[] = [
    {
        id: 'moon-collector',
        title: '달빛 수집가',
        likeCount: 128,
        viewCount: 1240,
        videoUrl: media('moon.mp4'),
        posterUrl: media('moon.webp'),
        artist,
        previews: [
            {
                id: 'neutral',
                label: '정면 표정',
                kind: 'image',
                thumbnailUrl: media('neutral.webp'),
                mediaUrl: media('neutral.webp'),
            },
            {
                id: 'smile',
                label: '웃는 표정',
                kind: 'image',
                thumbnailUrl: media('smile-thumb.webp'),
                mediaUrl: media('smile.webp'),
            },
            {
                id: 'turn',
                label: '고개를 든 모습',
                kind: 'gif',
                thumbnailUrl: media('turn-thumb.webp'),
                mediaUrl: media('turn.gif'),
            },
        ],
    },
    {
        id: 'harin',
        title: '하린',
        likeCount: 74,
        viewCount: 580,
        videoUrl: media('harin.mp4'),
        posterUrl: media('harin.webp'),
        artist,
        previews: [],
    },
    {
        id: 'narin',
        title: '나린',
        likeCount: 66,
        viewCount: 493,
        videoUrl: media('narin.mp4'),
        posterUrl: media('narin.webp'),
        artist,
        previews: [],
    },
]

// ⭐ 갤러리 정렬 옵션
export const virtualGallerySorts = [
    { value: 'recommended', label: '추천순' },
    { value: 'popular', label: '인기순' },
    { value: 'views', label: '조회순' },
    { value: 'likes', label: '좋아요순' },
] as const

type VirtualGallerySort = (typeof virtualGallerySorts)[number]['value']

// 샘플 인기순에 사용하는 조회 대비 좋아요 비율
function engagementRate(work: PublicVirtual) {
    return work.viewCount > 0 ? work.likeCount / work.viewCount : 0
}

// ⭐ 갤러리 목록 조회. 실제 API 연동 시 이 함수에서 목록을 가져옵니다.
export function listPublicVirtuals(
    query = '',
    sort: VirtualGallerySort = 'recommended',
) {
    const keyword = query.trim().normalize('NFC').toLocaleLowerCase('ko-KR')

    const matches = sampleWorks.filter((work) =>
        [work.title, work.artist.name].some((text) =>
            text.normalize('NFC').toLocaleLowerCase('ko-KR').includes(keyword),
        ),
    )

    switch (sort) {
        case 'popular':
            return matches.sort((a, b) =>
                engagementRate(b) - engagementRate(a) || b.viewCount - a.viewCount,
            )
        case 'views':
            return matches.sort((a, b) => b.viewCount - a.viewCount)
        case 'likes':
            return matches.sort((a, b) => b.likeCount - a.likeCount)
        default:
            // 추천순은 샘플 배열의 등록 순서로 표시
            return matches
    }
}

// ⭐ 상세 페이지에서 작품 ID로 공개 작품 조회
export function findPublicVirtual(id: string | undefined) {
    return sampleWorks.find((work) => work.id === id)
}

// ⭐ 같은 작가의 다른 공개 작품 조회
export function listRelatedVirtuals(work: PublicVirtual) {
    return sampleWorks.filter(
        (item) => item.artist.id === work.artist.id && item.id !== work.id,
    )
}