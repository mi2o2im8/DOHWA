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

const artist = {
    id: 'seoon',
    name: '서온',
    bio: '밤마다 달빛을 모아 그림을 그려요.',
    avatarUrl: media('avatar.webp'),
}

// ⭐ 샘플 데이터. 작가가 공개한 작품만 나열합니다.
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

// ⭐ 실제 API 연동 지점. 서버는 공개 상태를 확인하고 공개 필드만 응답합니다.
// 편집 원본, 분리 레이어, 리깅 데이터는 서버에서 응답 필드에서 제외합니다.
// 공개 목록·연관 작품은 카드용 필드만 조회하고, 상세는 id로 조회합니다.
export function listPublicVirtuals() {
    return sampleWorks
}

export function findPublicVirtual(id: string | undefined) {
    return sampleWorks.find((work) => work.id === id)
}

export function listRelatedVirtuals(work: PublicVirtual) {
    return sampleWorks.filter(
        (item) => item.artist.id === work.artist.id && item.id !== work.id,
    )
}
