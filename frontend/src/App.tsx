import { BrowserRouter, Routes, Route } from 'react-router'

import Header from './components/Header'

import HomePage from './pages/HomePage'
import CommunityPage from './pages/CommunityPage'
import RoomsPage from './pages/RoomsPage'
import ClipsPage from './pages/ClipsPage'
import ArtistsPage from './pages/ArtistsPage'
import StoryPage from './pages/StoryPage'

import LoginPage from './pages/account/auth/LoginPage'
import SignupPage from './pages/account/signup/SignupPage'
import MyPage from './pages/account/mypage/MyPage'
import NotificationPage from './pages/account/notifications/NotificationPage'

// 폴더를 나눈 버추얼 페이지
import VirtualGalleryPage from './pages/virtual/gallery/VirtualGalleryPage'
import VirtualPage from './pages/virtual/studio/VirtualPage'

function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/clip" element={<ClipsPage />} />
        <Route path="/artist" element={<ArtistsPage />} />
        <Route path="/story" element={<StoryPage />} />

        {/* /virtual은 갤러리, /virtual/create는 제작 화면 */}
        <Route path="/virtual" element={<VirtualGalleryPage />} />
        <Route path="/virtual/create" element={<VirtualPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App