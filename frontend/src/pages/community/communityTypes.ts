// ⭐ 커뮤니티 데이터 계약
export const categories = [
    '전체',
    '원화',
    '일러스트',
    '만화',
    '이펙트',
    '애니메이션',
    '질문ㆍ피드백',
    '자유 게시판',
] as const
export type Category = typeof categories[number]
export type Author = { id: string; nickname: string; avatarUrl?: string }
export type Media = { id: string; type: 'image' | 'video'; url: string; poster?: string; duration?: number }
export type Post = {
    id: string
    title: string
    body: string
    category: Exclude<Category, '전체'>
    author: Author
    createdAt: string
    media: Media[]
    views: number
    likes: number
    commentCount: number
    liked: boolean
    bookmarked: boolean
}
export type Comment = { id: string; author: Author; body: string; parentId?: string; createdAt: string }
export type HotIssue = { id: string; name: string; title: string; description: string; posts: Post[] }
export type Query = { category: Category; search: string; sort: string; page: number }
export type Draft = { category: Post['category']; title: string; body: string; attachments: (Media | File)[] }
