import type { Comment, Draft, HotIssue, Post, Query } from './communityTypes'

// 추후 FastAPI/Supabase 연결 지점. 현재 실제 저장 및 조회 API 미연결.
export const communityApi = {
    async list(_query: Query): Promise<{ posts: Post[]; hasMore: boolean }> {
        return { posts: [], hasMore: false }
    },
    async hot(): Promise<HotIssue[]> {
        return []
    },
    async detail(_id: string): Promise<Post | null> {
        return null
    },
    async comments(_id: string): Promise<Comment[]> {
        return []
    },
    async view(_id: string): Promise<void> {
        // 서버에서 중복 조회 방지 후 증가하도록 연결
    },
    async action(_id: string, _action: string, _body?: unknown): Promise<void> {
        throw new Error('아직 커뮤니티 저장 기능이 연결되지 않았어요.')
    },
    async save(_draft: Draft, _id?: string): Promise<string> {
        throw new Error('아직 게시글 등록 기능이 연결되지 않았어요.')
    },
}
