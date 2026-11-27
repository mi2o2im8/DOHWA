import { BrowserRouter, Routes, Route } from 'react-router'

// 공용 헤더
import Header from './components/Header'

import HomePage from './pages/HomePage'

// 커뮤니티
// 새 community 폴더에서 페이지를 불러옵니다.
import CommunityPage from './pages/community/CommunityPage'
import CommunityDetailPage from './pages/community/CommunityDetailPage'
import CommunityWritePage from './pages/community/CommunityWritePage'

// 작업방
import RoomsPage from './pages/RoomsPage'
// 클립
import ClipsPage from './pages/ClipsPage'
// 작가 찾기
// import ArtistsPage from './pages/ArtistsPage'
import ArtistPage from './pages/artist/ArtistPage'
// 스테이지(미연시)
import StagePage from './pages/stage/StagePage'

// 계정 관련 페이지
import LoginPage from './pages/account/auth/LoginPage'
import SignupPage from './pages/account/signup/SignupPage'
import MyPage from './pages/account/mypage/MyPage'
import NotificationPage from './pages/account/notifications/NotificationPage'

// 버추얼 페이지 폴더 분리
import VirtualGalleryPage from './pages/virtual/gallery/VirtualGalleryPage'
// 공개 상세 페이지
import VirtualDetailPage from './pages/virtual/gallery/VirtualDetailPage'
import VirtualPage from './pages/virtual/studio/VirtualPage'

function App() {
    return (
        <BrowserRouter>
            {/* 공용 컴포넌트 */}
            {/* 헤더 */}
            <Header />
            <Routes>
                {/* 카테고리 페이지들 */}
                {/* 메인홈페이지 */}
                <Route path='/' element={<HomePage />} />

                {/* 커뮤니티 */}
                <Route
                    path='/community'
                    element={<CommunityPage />}
                />

                {/* 작성과 수정은 같은 폼을 재사용합니다. */}
                <Route
                    path='/community/write'
                    element={<CommunityWritePage />}
                />
                <Route
                    path='/community/:postId/edit'
                    element={<CommunityWritePage />}
                />

                {/* 게시글을 독립 상세 페이지에서 표시합니다. */}
                <Route
                    path='/community/:postId'
                    element={<CommunityDetailPage />}
                />

                {/* 작업방 */}
                <Route path='/rooms' element={<RoomsPage />} />
                {/* 클립 */}
                <Route path='/clip' element={<ClipsPage />} />
                {/* 작가 찾기 */}
                {/* <Route path='/artist' element={<ArtistsPage />} /> */}
                <Route path='/artist' element={<ArtistPage />} />
                {/* 나의 버추얼 */}
                <Route
                    path='/virtual'
                    element={<VirtualGalleryPage />}
                />
                {/* 갤러리 카드에서 여는 공개 상세 */}
                <Route
                    path='/virtual/:virtualId'
                    element={<VirtualDetailPage />}
                />
                <Route
                    path='/virtual/create'
                    element={<VirtualPage />}
                />
                {/* 미연시 */}
                <Route path='/story' element={<StagePage />} />

                {/* 계정 관련 페이지 */}
                <Route path='/login' element={<LoginPage />} />
                <Route path='/signup' element={<SignupPage />} />
                <Route path='/mypage' element={<MyPage />} />
                <Route
                    path='/notifications'
                    element={<NotificationPage />}
                />
            </Routes>
        </BrowserRouter>
    )
}

export default App