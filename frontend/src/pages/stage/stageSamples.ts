// ⭐ 시안에서 가져온 작품과 장르별 예시 데이터
export const storyCategories = [
    '베스트', '로맨스', '스릴러', '미스테리', '액션',
    '공포', '성장물', '힐링물', '취향저격',
] as const

export const newStoriesCategory = '신규 도착 스토리'

type Genre = Exclude<typeof storyCategories[number], '베스트' | '취향저격'>

export type Story = {
    id: number
    title: string
    genre: Genre
    summary: string
    cover: string
    releasedOn: string
}

const samples: [number, string, Genre, string][] = [
    [1, '악덕 영애의 회귀는 달콤하다', '로맨스', '회귀한 영애는 자신을 몰락시킨 사람들의 비밀을 하나씩 밝혀낸다.'],
    [2, '이번 생은 착한 영애가 아닙니다', '로맨스', '두 번째 삶을 얻은 영애는 이번에는 자신의 행복을 먼저 선택한다.'],
    [3, '그와의 위험한 계약', '로맨스', '정체를 감춘 계약 상대와의 약속이 예상치 못한 마음으로 이어진다.'],
    [4, '이번에는 진짜, 공작님을 놓아줄게요', '로맨스', '같은 이별을 반복해 온 영애는 마침내 공작을 놓아주기로 한다.'],
    [5, '북부공작의 겨울 연가', '로맨스', '눈이 그치지 않는 북부에서 공작과 낯선 방문객의 겨울이 시작된다.'],
    [6, '얼어붙은 공작과 반역의 영애', '로맨스', '반역자로 몰린 영애가 얼어붙은 성을 지키는 공작에게 손을 내민다.'],
    [7, '마법공작의 비밀 수업', '로맨스', '비밀 수업을 시작한 견습생은 공작의 마법에 숨겨진 대가를 알게 된다.'],
    [8, '북부의 공작님이 집착합니다', '로맨스', '북부로 떠난 영애에게 공작이 뜻밖의 제안을 건넨다.'],
    [9, '탈출할 수 없는 저택', '스릴러', '문을 열 때마다 같은 복도가 나타나는 저택에서 탈출구를 찾아야 한다.'],
    [10, '죽음의 루프에서', '스릴러', '죽음으로 같은 하루가 반복되고, 주인공은 어제와 다른 선택을 한다.'],
    [11, '감금된 정원', '스릴러', '정원에서 사라진 손님의 흔적이 온실 깊은 곳으로 이어진다.'],
    [12, '게임의 마지막 수', '스릴러', '정체불명의 게임에서 마지막 수를 두기 전 참가자들의 비밀이 드러난다.'],
    [13, '봄, 다시 너에게', '힐링물', '오래 떠나 있던 마을에 돌아온 두 친구가 다시 봄을 맞는다.'],
    [14, '저녁 7시의 비밀 동맹', '미스테리', '저녁 7시마다 도착하는 편지를 따라 작은 동맹이 결성된다.'],
    [15, '유리성의 인형 공주', '공포', '밤마다 인형이 깨어나는 유리성에 새로운 손님이 찾아온다.'],
    [16, '이름 없는 구원자', '액션', '이름을 버린 구원자가 도시를 지키기 위해 마지막 작전에 합류한다.'],
    [17, '세 번째 계절이 찾아올 때', '성장물', '세 번째 계절을 함께 보내며 주인공은 자신이 원하는 삶을 찾아간다.'],
]

export const stories: Story[] = samples.map(([id, title, genre, summary]) => ({
    id,
    title,
    genre,
    summary,
    cover: `/story-cover-${id}.webp`,
    releasedOn: id >= 13 ? `2026-11-${40 - id}` : `2026-10-${10 + id}`,
}))

export const freshStories = stories
    .filter((story) => story.releasedOn >= '2026-11-23')
    .sort((first, second) => second.releasedOn.localeCompare(first.releasedOn))

export const hotStories = [stories[0], stories[4], stories[8]]
export const tailoredStories = [stories[12], stories[4], stories[8], stories[16]]

export const recommendedSections = [
    { title: '악덕 영애와 떠나는 티켓표', category: '로맨스', stories: stories.slice(0, 4) },
    { title: '북부공작과 함께 떠나자', category: '로맨스', stories: stories.slice(4, 8) },
    { title: '탈출하지 못하면 죽음뿐', category: '스릴러', stories: stories.slice(8, 12) },
    { title: '취향저격 추천', category: '취향저격', stories: tailoredStories },
    { title: newStoriesCategory, category: newStoriesCategory, stories: freshStories },
]

export const episodeTitles = ['첫 만남', '낯선 약속', '감춰진 단서', '다음 역에서']
