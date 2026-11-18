import { createClient } from '@supabase/supabase-js'

// 환경변수 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 환경변수 확인
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase 환경변수를 확인해주세요.')
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey)