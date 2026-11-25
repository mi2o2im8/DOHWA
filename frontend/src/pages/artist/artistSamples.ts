import suchaeMain from './assets/suchae-main.webp'
import suchaeMoon from './assets/suchae-moon.webp'
import suchaeWindow from './assets/suchae-window.webp'
import yeonduMain from './assets/yeondu-main.webp'
import yeonduSky from './assets/yeondu-sky.webp'

export const artistFilters = {
    field: { label: '분야', options: ['일러스트', '캐릭터', '배경', '웹툰'] },
    style: { label: '그림체', options: ['SD', '만화풍', '반실사'] },
    mood: { label: '분위기', options: ['몽환적인', '따뜻한', '발랄한', '시원한'] },
}

export type FilterKey = keyof typeof artistFilters

export const filterKeys: FilterKey[] = ['field', 'style', 'mood']

export type Artist = {
    id: string
    name: string
    tags: string[]
    categories: Record<FilterKey, string[]>
    bio: string
    followers: number
    works: { src: string; title: string }[]
}

// Supabase 연결 전 화면 확인에 사용하는 작가 데이터
export const artistSamples: Artist[] = [
    {
        id: 'suchae',
        name: '수채',
        tags: ['일러스트', '캐릭터', '몽환적인'],
        categories: {
            field: ['일러스트', '캐릭터', '배경'],
            style: ['반실사'],
            mood: ['몽환적인', '따뜻한'],
        },
        bio: '빛이 머무는 일상을 그립니다.\n함께 작업하고 다정하게 피드백을 나누는 시간을 좋아해요.',
        followers: 128,
        works: [
            { src: suchaeMain, title: '햇살 속 인물' },
            { src: suchaeMoon, title: '보랏빛 달밤' },
            { src: suchaeWindow, title: '햇빛이 드는 창가' },
        ],
    },
    {
        id: 'yeondu',
        name: '연두',
        tags: ['캐릭터', '만화풍', '시원한'],
        categories: {
            field: ['캐릭터', '웹툰'],
            style: ['만화풍'],
            mood: ['시원한', '발랄한'],
        },
        bio: '오늘의 선을 모아 내일의 그림으로.\n인물 드로잉과 캐릭터를 그리고 있어요.',
        followers: 96,
        works: [
            { src: yeonduMain, title: '푸른 머리의 캐릭터' },
            { src: yeonduSky, title: '여름 하늘 아래' },
        ],
    },
]
