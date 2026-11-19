// 로그인

// React 상태 관리
import { useState } from "react"
import type { FormEvent } from "react"
// 페이지 이동
import { Link, useNavigate } from "react-router"
// Supabase 클라이언트
import { supabase, setLoginSessionPreference } from "../../../lib/supabase"
import './LoginPage.css'

function LoginPage(){
    // 아이디 기억에 사용할 저장 키
    const REMEMBERED_EMAIL_KEY= 'dohwa.rememberdEmail'

    // 로그인 입력 상태
    const [email, setEmail] = useState(() => {
        // 로그인 페이지 오픈시 저장된 이메일 불러오기
        try{
            return localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
        } catch {
            return ''
        }
    })
    const [password, setPassword] = useState('')

    // 아이디 기억 체크 상태
    const [rememberEmail, setRememberEmail] = useState(Boolean(email))

    // 자동로그인 체크 상태
    const [keepSession, setKeepSession] = useState(false)

    // 비밀번호 보기
    const [showPassword, setShowPassword] = useState(false)

    // 로그인 진행 상태 및 결과
    const [isLoading, setIsLoading] = useState(false)
    const [loginMessage, setLoginMessage] = useState('')

    const navigate = useNavigate()

    // Supabase 로그인
    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (isLoading) return

        setLoginMessage('')

        // 입력값 확인
        if (!email.trim() || !password) {
            setLoginMessage('이메일과 비밀번호를 입력해 주세요.')
            return
        }

        setIsLoading(true)

        try {
            // Supabase Auth 인증
            const { data, error } =
                await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password
                })

            if (error) {
                throw error
            }

            // 이번 로그인에 사용할 세션 저장 방식 지정
            setLoginSessionPreference(keepSession)

            // 실제 로그인 세션 확인
            if (!data.session || !data.user) {
                setLoginMessage(
                    '로그인 세션을 확인하지 못했습니다.'
                )
                return
            }

            // 이메일 인증 여부 확인
            if (!data.user.email_confirmed_at) {
                await supabase.auth.signOut()

                setLoginMessage(
                    '이메일 인증을 완료한 후 로그인해 주세요.'
                )
                return
            }

            // 로그인 성공 후 체크한 이메일 저장
            if (rememberEmail) {
                try {
                    localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
                } catch {
                    console.warn('이메일 기억 저장 실패', error)
                }
            }

            // 로그인 성공 시 홈으로 이동
            navigate('/', { replace: true })

        } catch (error) {
            console.error('로그인 오류:', error)

            const message =
                error instanceof Error
                    ? error.message.toLowerCase()
                    : ''

            // 이메일 인증 전
            if (message.includes('email not confirmed')) {
                setLoginMessage(
                    '이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.'
                )
            }
            // 아이디 또는 비밀번호 오류
            else if (message.includes('invalid login credentials')) {
                setLoginMessage(
                    '이메일 또는 비밀번호가 올바르지 않습니다.'
                )
            }
            // 요청 제한
            else if (message.includes('rate limit')) {
                setLoginMessage(
                    '로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
                )
            }
            // 기타 오류
            else {
                setLoginMessage(
                    '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
                )
            }

        } finally {
            // 이번 로그인에 사용한 저장 설정 초기화
            setLoginSessionPreference(undefined)
            setIsLoading(false)
        }
    }

    return(
        // 로그인 페이지 레이아웃 유지
        <main className="login-page">

            {/* 로그인 카드 추가 */}
            <section className="login-card">

                <h1>도화 로그인</h1>
                <p>함께 그리는 즐거움, DOHWA</p>

                {/* 로그인 입력 폼 */}
                <form onSubmit={handleLogin}>

                    <div>
                        <label htmlFor="loginEmail">
                            이메일
                        </label>

                        <input
                            id="loginEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일을 입력하세요."
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="loginPassword">
                            비밀번호
                        </label>

                        {/* 비밀번호 입력창과 버튼 정렬 */}
                        <div className="login-password-field">
                            <input
                                id="loginPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="비밀번호를 입력하세요."
                                autoComplete="current-password"
                                required
                            />

                            {/* 비밀번호 보기 */}
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword((prev) => !prev)
                                }
                            >
                                {showPassword ? '숨기기' : '보기'}
                            </button>
                        </div>
                    </div>

                    {/* 아이디 기억 */}
                    <label htmlFor="rememberEmail" className="login-remember-email">
                        <input
                            id="rememberEmail"
                            type="checkbox"
                            checked= {rememberEmail}
                            disabled= {isLoading}
                            onChange={(e)=> {
                                const checked = e.target.checked
                                setRememberEmail(checked)

                                if (!checked) {
                                    try {
                                        localStorage.removeItem(REMEMBERED_EMAIL_KEY)
                                    }catch {
                                        console.warn('저장된 이메일을 삭제할 수 없습니다.')
                                    }
                                }
                            }}
                        />
                        아이디 기억하기
                    </label>
                    
                    {/* 자동로그인 */}
                    <label htmlFor="keepSession" className="login-remember-email">
                        <input
                            id="keepSession"
                            type="checkbox"
                            checked={keepSession}
                            disabled={isLoading}
                            onChange={(e) => setKeepSession(e.target.checked)}
                        />
                        자동로그인
                    </label>

                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? '로그인 중...' : '로그인'}
                    </button>

                    {/* 오류 메시지 */}
                    {loginMessage && (
                        <p role="alert">
                            {loginMessage}
                        </p>
                    )}

                </form>

                {/* 회원가입 링크 스타일 및 경로 수정 */}
                <p className="login-signup-link">
                    아직 계정이 없으신가요?{' '}
                    <Link to="/signup">
                        회원가입
                    </Link>
                </p>

            </section>
        </main>
    )
}

export default LoginPage
