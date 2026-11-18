import {supabase} from './supabase'

export async function testSupabaseConnection() {
    const {error} = await supabase.auth.getSession()

    if (error) {
        console.error('Supabase 오류:', error.message)
        return
    }

    console.log('Supabase 클라이언트 정상 작동')
}