import { BrowserRouter, Routes, Route } from 'react-router'

// 공용 헤더
import Header from './components/Header'

import HomePage from './pages/HomePage'
// 커뮤니티
import CommunityPage from './pages/CommunityPage'
// 작업방
import RoomsPage from './pages/RoomsPage'
// 클립
import ClipsPage from './pages/ClipsPage'
// 작가 찾기
import ArtistsPage from './pages/ArtistsPage'
// 나의 버추얼 
import VirtualPage from './pages/VirtualPage'
// 미연시
import StoryPage from './pages/StoryPage'

// 계정 관련 페이지
import LoginPage from './pages/account/auth/LoginPage'
import SignupPage from './pages/account/signup/SignupPage'
import MyPage from './pages/account/mypage/MyPage'
import NotificationPage from './pages/account/notifications/NotificationPage'


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
        <Route path='/community' element={<CommunityPage />}/>
        {/* 작업방 */}
        <Route path='/rooms' element={<RoomsPage />} />
        {/* 클립 */}
        <Route path='/clip' element={<ClipsPage />} />
        {/* 작가 찾기 */}
        <Route path='/artist' element={<ArtistsPage />} />
        {/* 나의 버추얼 */}
        <Route path='/virtual' element={<VirtualPage />} />
        {/* 미연시 */}
        <Route path='/story' element={<StoryPage />} />

        {/* 계정 관련 페이지 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App