import { createClient } from '@supabase/supabase-js'

// 환경변수 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 환경변수 확인
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase 환경변수를 확인해주세요.')
}

// 기존 Supabase 세션 저장 키 유지
const authStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

// 비밀번호 로그인 요청 중에만 체크 여부 우선 적용
let keepSessionOnLogin: boolean | undefined

export function setLoginSessionPreference(keepSession: boolean | undefined) {
    keepSessionOnLogin = keepSession
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storageKey: authStorageKey,
        persistSession: true,
        storage: {
            getItem(key: string) {
                if (key === authStorageKey) {
                    return sessionStorage.getItem(key) ?? localStorage.getItem(key)
                }

                return localStorage.getItem(key)
            },

            setItem(key: string, value: string) {
                if (key !== authStorageKey) {
                    localStorage.setItem(key, value)
                    return
                }

                // 토큰 갱신 시 현재 세션의 저장 위치 유지
                const keepSession = keepSessionOnLogin
                    ?? (sessionStorage.getItem(key) === null)

                const target = keepSession ? localStorage : sessionStorage
                const previous = keepSession ? sessionStorage : localStorage

                target.setItem(key, value)
                previous.removeItem(key)
            },

            removeItem(key: string) {
                localStorage.removeItem(key)

                if (key === authStorageKey) {
                    sessionStorage.removeItem(key)
                }
            },
        },
    },
})