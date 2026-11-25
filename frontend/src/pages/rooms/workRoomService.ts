import sunlight from './covers/sunlight.webp'
import croquis from './covers/croquis.webp'
import feedback from './covers/feedback.webp'
import clouds from './covers/clouds.webp'
import deadline from './covers/deadline.webp'

export const categories = {
    free: '자유 작업',
    drawing: '드로잉',
    feedback: '피드백',
} as const

export type Category = keyof typeof categories

export type PublicRoom = {
    id: string
    name: string
    description: string
    category: Category
    memberCount: number
    capacity: number
    coverUrl?: string
    note?: string
    nextRoundAt?: string
    featured?: boolean
}

type CreateRoom = Pick<PublicRoom, 'name' | 'category'> &
    ({ visibility: 'public' } | { visibility: 'private'; password: string })

type RoomAccess = { id: string; name: string }

type CreatedRoom = RoomAccess &
    ({ visibility: 'public' } | { visibility: 'private'; roomNumber: string })

const roundAt = new Date(Date.now() + 168_000).toISOString()

const publicRooms: PublicRoom[] = [
    { id: 'sunlight', name: '햇살이 드는 오후 작업실', description: '차 한 잔, 그림 한 장, 느긋하게 함께 그려요.', category: 'free', memberCount: 4, capacity: 8, coverUrl: sunlight, note: '웹툰 12화 3컷 밑색 중', featured: true },
    { id: 'croquis', name: '밤의 크로키 모임', description: '10분씩, 가볍게 선을 긋는 시간.', category: 'drawing', memberCount: 3, capacity: 8, coverUrl: croquis, nextRoundAt: roundAt, featured: true },
    { id: 'feedback', name: '오늘의 피드백 한 스푼', description: '서로의 그림을 살펴보고 이야기해요.', category: 'feedback', memberCount: 3, capacity: 6, coverUrl: feedback, note: '표정 러프 피드백 구해요', featured: true },
    { id: 'clouds', name: '혼자여도 같이 그려요', description: '각자 작업하지만, 같은 시간에 함께 집중해요.', category: 'free', memberCount: 2, capacity: 6, coverUrl: clouds },
    { id: 'deadline', name: '마감 한 컷', description: '마감 전, 마지막 한 컷을 함께 달려요!', category: 'drawing', memberCount: 3, capacity: 5, coverUrl: deadline },
]

const privateRooms = new Map<string, RoomAccess & { password: string }>()
let nextRoomNumber = 4218

// ⭐ FastAPI 연동 시 아래 메서드를 서버 요청으로 교체합니다.
// 데모 방과 비밀번호는 현재 탭 메모리에서만 유지됩니다.
export interface WorkRoomService {
    listPublicRooms(): Promise<PublicRoom[]>
    createRoom(input: CreateRoom): Promise<CreatedRoom>
    joinPublicRoom(id: string): Promise<RoomAccess>
    joinPrivateRoom(input: { roomNumber: string; password: string }): Promise<RoomAccess>
}

export const workRoomService: WorkRoomService = {
    async listPublicRooms() {
        return [...publicRooms]
    },

    async createRoom(input) {
        const room = { id: crypto.randomUUID(), name: input.name }

        if (input.visibility === 'private') {
            const roomNumber = String(nextRoomNumber++).padStart(6, '0')
            privateRooms.set(roomNumber, { ...room, password: input.password })
            return { ...room, visibility: 'private', roomNumber }
        }

        publicRooms.unshift({
            ...room,
            category: input.category,
            description: '',
            memberCount: 1,
            capacity: 8,
        })
        return { ...room, visibility: 'public' }
    },

    async joinPublicRoom(id) {
        const room = publicRooms.find((item) => item.id === id)
        if (!room) throw new Error('작업방을 찾을 수 없어요.')
        if (room.memberCount >= room.capacity) throw new Error('작업방의 정원이 찼어요.')
        return { id: room.id, name: room.name }
    },

    async joinPrivateRoom({ roomNumber, password }) {
        const room = privateRooms.get(roomNumber)
        if (!room || room.password !== password) {
            throw new Error('방 번호 또는 비밀번호를 확인해 주세요.')
        }
        return { id: room.id, name: room.name }
    },
}
