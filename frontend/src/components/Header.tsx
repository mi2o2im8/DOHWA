import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import './Header.css'

function Header() {
    // 로그인 세션 확인 중에는 프로필 버튼을 잠시 숨김
    const [session, setSession] = useState<Session | null | undefined>(undefined)

    useEffect(() => {
        // 새로고침, 로그인, 로그아웃 시 세션 상태 반영
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                setSession(currentSession)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const email = session?.user.email

    return (
        <header className="header">
            <div className="header-inner">

                {/* 도화 로고 */}
                <Link to="/" className="header-logo">
                    도화 <small>DOHWA</small>
                </Link>

                {/* 상단 가로 메뉴 */}
                <nav className="header-nav">
                    <NavLink to="/" end>홈</NavLink>
                    <NavLink to="/rooms">작업방</NavLink>
                    <NavLink to="/virtual">버추얼</NavLink>
                    <NavLink to="/clip">도화 클립</NavLink>
                    <NavLink to="/community">커뮤니티</NavLink>
                    <NavLink to="/artist">작가 찾기</NavLink>
                    <NavLink to="/story">스토리</NavLink>
                </nav>

                {/* 사용자 메뉴 */}
                <div className="header-actions">

                    {/* 로그인한 경우에만 로그아웃 버튼 표시 */}
                    {session && (
                        <button
                            type="button"
                            onClick={async () => {
                                const { error } = await supabase.auth.signOut({ scope: 'local' })

                                if (error) {
                                    window.alert('로그아웃에 실패했어요. 다시 시도해 주세요.')
                                }
                            }}
                        >
                            로그아웃
                        </button>
                    )}

                    <Link to="/notifications" aria-label="알림">
                        ♧
                    </Link>

                    {/* 로그인한 계정 표시 */}
                    {email && (
                        <span className="header-user-email" title={email}>
                            {email}
                        </span>
                    )}

                    {/* 로그인 상태에 따라 프로필 버튼 경로 변경 */}
                    {session !== undefined && (
                        <Link
                            to={session ? '/mypage' : '/login'}
                            className="user-circle"
                            aria-label={session ? '마이페이지' : '로그인'}
                        >
                            {session ? email?.charAt(0).toUpperCase() || '나' : '나'}
                        </Link>
                    )}
                </div>

            </div>
        </header>
    )
}

export default Header