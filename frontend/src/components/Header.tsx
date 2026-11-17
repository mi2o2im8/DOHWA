
import { Link, NavLink } from 'react-router'
import './Header.css'

function Header() {
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
                    <NavLink to='/story'>스토리</NavLink>
                </nav>

                {/* 사용자 메뉴 */}
                <div className="header-actions">
                    <Link to="/notifications" aria-label="알림">
                        ♧
                    </Link>
                    <Link
                        to="/mypage"
                        className="user-circle"
                        aria-label="마이페이지"
                    >
                        나
                    </Link>
                </div>

            </div>
        </header>
    )
}

export default Header