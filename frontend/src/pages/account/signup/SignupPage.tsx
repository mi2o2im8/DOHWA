// 회원가입

import { useRef, useState } from "react"
// 회원가입 버튼 연속 클릭시 중복 요청 막는 역할
import type { FormEvent } from "react"
import { supabase } from "../../../lib/supabase"
import { replace, useNavigate } from "react-router"
import './SignupPage.css'

async function postSignupApi(path: string, body: Record<string, unknown>) {
    const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!response.ok) {
        throw new Error(typeof result.detail === 'string' ? result.detail : '입력값을 확인해 주세요.')
    }
    return result
}

function SignupPage(){

    const navigate = useNavigate()

    // 이름
    const [realName, setRealName] = useState('')

    // 이메일
    const [emailId, setEmailId] = useState('')
    const [emailDomain, setEmailDomain] = useState('gmail.com')
    const [customDomain, setCustomDomain] = useState('')

    // 비밀번호
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')

    // 닉네임 (선택버전)
    const [nickname, setNickname] = useState('')

    // 닉네임 중복 확인 안내
    const [nicknameMessage, setNicknameMessage] = useState('')

    // 닉네임 형식 검증
    // 완성형 한글, 영문, 숫자만 허용
    // 1~12자
    const nicknameRegex = /^[가-힣a-zA-Z0-9]{1,12}$/

    // 생년월일
    const [birthYear, setBirthYear] = useState('')
    const [birthMonth, setBirthMonth] = useState('')
    const [birthDay, setBirthDay] = useState('')

    // 성별 (선택)
    const [gender, setGender] = useState('')

    // 한글 이름 2~10자
    const koreanNameRegex = /^[가-힣]{2,10}$/

    // 영어 이름 2~30자 (공백 허용)
    const englishNameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/

    // 한글 or 영어 검사
    const isNameValid =
        koreanNameRegex.test(realName) ||
        (
            realName.length >= 2 &&
            realName.length <= 30 &&
            englishNameRegex.test(realName)
        )

    // 이메일 주소 조합
    const domain = emailDomain === 'other'
        ? customDomain
        : emailDomain

    const email = `${emailId}@${domain}`

    // 이메일 아이디 형식 검사
    const emailIdRegex = /^[a-zA-Z0-9._%+-]+$/

    const isEmailIdValid =
        emailIdRegex.test(emailId) &&
        !emailId.startsWith('.') &&
        !emailId.endsWith('.') &&
        !emailId.includes('..')

    // 이메일 도메인 형식 검사
    const domainRegex =
        /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

    // 이메일 전체 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // 각각의 검사 결과
    const isDomainValid = domainRegex.test(domain)

    // 최종 이메일 검증
    const isEmailValid =
        isEmailIdValid &&
        isDomainValid &&
        emailRegex.test(email)

    // 이메일 인증
    const [verificationEmail, setVerificationEmail] = useState('')
    const [verificationCode, setVerificationCode] = useState('')
    const [emailMessage, setEmailMessage] = useState('')

    const [ticket, setTicket] = useState('')
    const [emailBusy, setEmailBusy] = useState(false)
    const emailVersion = useRef(0)

    const resetEmailVerification = () => {
        emailVersion.current += 1
        setTicket('')
        setVerificationEmail('')
        setVerificationCode('')
        setEmailMessage('')
    }

    const [showPassword, setShowPassword] = useState(false)

    // const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

    // 비밀번호 길이 검증
    const isPasswordValid =
        password.length >= 8 &&
        password.length <= 64

    // 비밀번호 일치 여부
    const isPasswordMatch =
        password.length > 0 &&
        password === passwordConfirm

    // 년도 목록 생성 (1900~현재까지)
    const currentYear = new Date().getFullYear()

    const years = Array.from(
        { length: currentYear - 1899 },
        (_, i) => currentYear - i
    )

    // 월 목록 생성
    const months = Array.from(
        { length: 12 },
        (_, i) => i + 1
    )

    // 선택한 년도와 월에 맞는 일수 계산
    const daysInMonth = birthYear && birthMonth
        ? new Date(Number(birthYear), Number(birthMonth), 0).getDate()
        : 31

    const days = Array.from(
        { length: daysInMonth },
        (_, i) => i + 1
    )

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selectedBirthDate = new Date(
        Number(birthYear),
        Number(birthMonth) - 1,
        Number(birthDay)
    )

    const isBirthComplete = Boolean(
        birthYear && birthMonth && birthDay
    )

    const isBirthValid =
        isBirthComplete &&
        selectedBirthDate.getFullYear() === Number(birthYear) &&
        selectedBirthDate.getMonth() === Number(birthMonth) - 1 &&
        selectedBirthDate.getDate() === Number(birthDay) &&
        selectedBirthDate <= today

    // 이메일 인증 요청
    const handleRequestVerification = async () => {
        if (!isEmailValid || emailBusy) return
        const version = emailVersion.current
        setEmailBusy(true)
        setEmailMessage('인증번호를 보내고 있습니다.')
        try {
            await postSignupApi('/email/request-verification', { email })
            if (version !== emailVersion.current) return
            setTicket('')
            setVerificationEmail(email)
            setVerificationCode('')
            setEmailMessage('인증번호를 보냈습니다. 5분 안에 입력해 주세요.')
        } catch (error) {
            if (version === emailVersion.current) {
                setEmailMessage(error instanceof Error ? error.message : '발송에 실패했습니다.')
            }
        } finally {
            setEmailBusy(false)
        }
    }

    // 이메일 인증번호 확인
    const handleVerifyEmail = async () => {
        if (verificationEmail !== email || emailBusy) return
        const version = emailVersion.current
        setEmailBusy(true)
        try {
            const result = await postSignupApi('/email/verify', { email, code: verificationCode.trim() })
            if (version !== emailVersion.current) return
            setTicket(result.ticket)
            setEmailMessage('이메일 인증이 완료되었습니다.')
        } catch (error) {
            if (version === emailVersion.current) {
                setEmailMessage(error instanceof Error ? error.message : '인증번호를 확인해 주세요.')
            }
        } finally {
            setEmailBusy(false)
        }
    }

    // 닉네임 중복 확인: 입력한 경우에만 실행
    // 닉네임 형식 검증 + Supabase 중복 확인
    const handleCheckNickname = async () => {

        const value = nickname.trim()

        if (!value) return

        // 닉네임 정규식 검사
        if (!nicknameRegex.test(value)) {
            setNicknameMessage(
                '닉네임은 완성형 한글, 영문, 숫자 1~12자로 입력해 주세요.'
            )
            return
        }

        setNicknameMessage('중복 확인 중...')

        // Supabase 중복 확인
        const { data, error } = await supabase.rpc(
            'is_nickname_available',
            { requested_nickname: value }
        )

        if (error) {
            console.error('닉네임 중복 확인 오류:', error)
            setNicknameMessage('중복 확인에 실패했습니다.')
            return
        }

        if (data === true) {
            setNicknameMessage('사용 가능한 닉네임입니다.')
        } else {
            setNicknameMessage('이미 사용 중인 닉네임입니다.')
        }
    }


    // 회원가입 진행 상태
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 회원가입 결과 메시지
    const [signupMessage, setSignupMessage] = useState('')

    // 회원가입 요청 완료 여부
    const [signupSuccess, setSignupSuccess] = useState(false)

    // 연속 제출 방지
    const submittingRef = useRef(false)

    // 회원가입 처리 함수
    const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (submittingRef.current || signupSuccess) return

        setSignupMessage('')

        // 기존 입력값 검증
        if (!isNameValid) {
            setSignupMessage('이름 형식을 확인해 주세요.')
            return
        }

        if (!isEmailValid) {
            setSignupMessage('이메일 형식을 확인해 주세요.')
            return
        }

        if (!ticket || verificationEmail !== email || emailBusy) {
            setSignupMessage('이메일 인증을 완료해 주세요.')
            return
        }

        if (!isPasswordValid) {
            setSignupMessage('비밀번호는 8~64자로 입력해 주세요.')
            return
        }

        if (!isPasswordMatch) {
            setSignupMessage('비밀번호가 일치하지 않습니다.')
            return
        }

        if (!isBirthValid) {
            setSignupMessage('생년월일을 확인해 주세요.')
            return
        }

        // 현재 원본에는 약관 동의 상태가 없음
        // 실제 서비스 공개 전에 필수 약관 검증 추가 필요

        submittingRef.current = true
        setIsSubmitting(true)

        try {
            const trimmedNickname = nickname.trim()

            // 닉네임을 입력한 경우에만 형식 검증
            if (trimmedNickname) {
                if (!nicknameRegex.test(trimmedNickname)) {
                    setSignupMessage(
                        '닉네임은 완성형 한글, 영문, 숫자 1~12자로 입력해 주세요.'
                    )
                    return
                }

                // 회원가입 직전 닉네임 중복 재확인
                const { data: available, error: nicknameError } =
                    await supabase.rpc(
                        'is_nickname_available',
                        { requested_nickname: trimmedNickname }
                    )

                if (nicknameError) throw nicknameError

                if (available !== true) {
                    setSignupMessage('이미 사용 중인 닉네임입니다.')
                    return
                }
            }

            // 생년월일을 YYYY-MM-DD 형태로 변환
            const birthDate = [
                birthYear,
                birthMonth.padStart(2, '0'),
                birthDay.padStart(2, '0')
            ].join('-')

            // Supabase Auth 회원가입 요청
            await postSignupApi('/signup', {
                email, password, ticket,
                // ⭐ DB 트리거에서 사용할 프로필 데이터
                real_name: realName.trim(),
                nickname: trimmedNickname || null,
                birth_date: birthDate,
                gender: gender || null
            })

            // 회원가입 요청 성공
            setSignupSuccess(true)
            setSignupMessage('회원가입이 완료되었습니다.')

            // 기존 이메일 인증 UI에서 사용
            setVerificationCode('')

            // 회원가입 완료 후 베이직 홈으로 이동
            navigate('/',{replace:true})

        } catch (error) {
            console.error('회원가입 오류:', error)

            const message =
                error instanceof Error
                    ? error.message.toLowerCase()
                    : ''

            if (message.includes('password')) {
                setSignupMessage(
                    '비밀번호가 Supabase 보안 정책에 맞지 않습니다.'
                )
            } else if (message.includes('rate limit')) {
                setSignupMessage(
                    '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
                )
            } else if (message.includes('already registered')) {
                setSignupMessage(
                    '이미 가입된 이메일입니다.'
                )
            } else if (
                message.includes('duplicate') ||
                message.includes('unique')
            ) {
                setSignupMessage(
                    '닉네임 중복 등으로 가입할 수 없습니다. 입력값을 확인해 주세요.'
                )
            } else {
                setSignupMessage(
                    error instanceof Error ? error.message : '회원가입에 실패했습니다.'
                )
            }

        } finally {
            submittingRef.current = false
            setIsSubmitting(false)
        }
    }

    const renderEyeIcon = (visible: boolean) => (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {!visible && <path d="M3 3 21 21" />}
        </svg>
    )

    return(
        <main className="signup-page">
            <section className="signup-card">
                <h1>도화 회원가입</h1>
                <p>함께 그리는 즐거움, DOHWA</p>

                <form onSubmit={handleSignup}>
                    <label htmlFor="realName">이름 *</label>
                    <input
                        id="realName"
                        value={realName}
                        onChange={(e) => {
                            // 입력한 값 가져오기
                            const value = e.target.value

                            // 한글만 입력한 경우 최대 10자
                            if (/^[가-힣]*$/.test(value) && value.length > 10) {
                                return
                            }

                            // 영문이름 최대 30자
                            if (value.length > 30) {
                                return
                            }

                            setRealName(value)
                        }}
                        placeholder="이름을 입력하세요."
                        autoComplete="name"
                        required
                    />

                    {/* 실시간 이름 검증 */}
                    {realName.length > 0 && (
                        <small
                            style={{
                                color: isNameValid ? '#3b9c75' : '#e26b79'
                            }}
                        >
                            {isNameValid
                                ? '올바른 이름 형식입니다.'
                                : '한글 2~10자 또는 영문 2~30자로 입력해 주세요.'
                            }
                        </small>
                    )}

                    <label htmlFor="emailId">이메일 *</label>
                    <div className="email-row">
                        <input
                            id="emailId"
                            value={emailId}
                            onChange={(e) => {
                                setEmailId(e.target.value)
                                resetEmailVerification()
                            }}
                            placeholder="이메일 아이디"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                        />

                        <span>@</span>

                        <select
                            value={emailDomain}
                            onChange={(e) => {
                                setEmailDomain(e.target.value)
                                resetEmailVerification()
                            }}
                            aria-label="이메일 도메인"
                        >
                            <option value="gmail.com">gmail.com</option>
                            <option value="naver.com">naver.com</option>
                            <option value="daum.net">daum.net</option>
                            <option value="kakao.com">kakao.com</option>
                            <option value="other">기타</option>
                        </select>
                    </div>

                    {emailDomain === 'other' && (
                        <input
                            value={customDomain}
                            onChange={(e) => {
                                setCustomDomain(e.target.value)
                                resetEmailVerification()
                            }}
                            placeholder="도메인 직접 입력"
                            aria-label="직접 입력 이메일 도메인"
                            autoCapitalize="none"
                            spellCheck={false}
                            required
                        />
                    )}

                    <small>입력 이메일: {email}</small>

                    {/* 이메일 인증 요청 */}
                    <button
                        type="button"
                        disabled={!isEmailValid || emailBusy || isSubmitting || signupSuccess}
                        onClick={handleRequestVerification}
                    >
                        이메일 인증 요청
                    </button>

                    {/* 이메일 인증번호 확인 */}
                    {verificationEmail !== '' && verificationEmail === email && (
                        <>
                            <div className="verification-row">
                                <input
                                    value={verificationCode}
                                    onChange={(e) =>
                                        setVerificationCode(e.target.value)
                                    }
                                    placeholder="인증번호 입력"
                                    aria-label="이메일 인증번호"
                                    autoComplete="one-time-code"
                                />

                                <button
                                    type="button"
                                    disabled={!/^\d{6}$/.test(verificationCode) || emailBusy || Boolean(ticket)}
                                    onClick={handleVerifyEmail}
                                >
                                    인증확인
                                </button>
                            </div>


                        </>
                    )}

                    {emailMessage && <small role="status">{emailMessage}</small>}

                    {/* 이메일 입력 결과 표시 */}
                    {emailId.length > 0 && (
                        <small
                            style={{
                                color: isEmailValid ? '#3b9c75' : '#e26b79'
                            }}
                        >
                            {isEmailValid
                                ? '올바른 이메일 형식입니다.'
                                : '이메일 주소 형식을 확인해 주세요.'}
                        </small>
                    )}

                    <label htmlFor="password">비밀번호 *</label>
                    <div className="password-row">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="8~64자"
                            minLength={8}
                            maxLength={64}
                            autoComplete="new-password"
                            required
                        />

                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                                showPassword ? '비밀번호 숨기기' : '비밀번호 보기'
                            }
                            aria-pressed={showPassword}
                            aria-controls="password"
                        >
                            {renderEyeIcon(showPassword)}
                        </button>
                    </div>

                    {password.length > 0 && (
                        <small
                            style={{
                                color: isPasswordValid ? '#3b9c75' : '#e26b79'
                            }}
                        >
                            {isPasswordValid
                                ? '사용 가능한 비밀번호 길이입니다.'
                                : '비밀번호는 8~64자로 입력해 주세요.'}
                        </small>
                    )}

                    <label htmlFor="passwordConfirm">
                        비밀번호 확인 *
                    </label>
                    <input
                        id="passwordConfirm"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="비밀번호 재입력"
                        maxLength={64}
                        autoComplete="new-password"
                        required
                    />

                    {/* 비밀번호 일치 검증 */}
                    {passwordConfirm.length > 0 && (
                        <small
                            style={{
                                color: isPasswordMatch ? '#3b9c75' : '#e26b79'
                            }}
                        >
                            {isPasswordMatch
                                ? '비밀번호가 일치합니다.'
                                : '비밀번호가 일치하지 않습니다.'
                            }
                        </small>
                    )}

                    {/* 닉네임 입력 */}
                    <label htmlFor="nickname">닉네임 (선택)</label>
                    <div className="nickname-row">
                        <input
                            id="nickname"
                            value={nickname}
                            onChange={(e) => {
                                setNickname(e.target.value)
                                setNicknameMessage('')
                            }}
                            placeholder="미입력 시 자동 생성"
                            autoComplete="nickname"
                        />

                        <button
                            type="button"
                            disabled={!nickname.trim()}
                            onClick={handleCheckNickname}
                        >
                            중복 확인
                        </button>
                    </div>

                    {nicknameMessage && (
                        <small role="status">{nicknameMessage}</small>
                    )}

                    <label>생년월일 *</label>
                    <div className="birth-row">
                        <select
                            value={birthYear}
                            onChange={(e) => {
                                setBirthYear(e.target.value)
                                setBirthDay('')
                            }}
                            aria-label="출생 연도"
                            required
                        >
                            <option value="">년도</option>

                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year}년
                                </option>
                            ))}
                        </select>

                        <select
                            value={birthMonth}
                            onChange={(e) => {
                                setBirthMonth(e.target.value)
                                setBirthDay('')
                            }}
                            aria-label="출생 월"
                            required
                        >
                            <option value="">월</option>

                            {months.map((month) => (
                                <option key={month} value={month}>
                                    {month}월
                                </option>
                            ))}
                        </select>

                        <select
                            value={birthDay}
                            onChange={(e) => {
                                setBirthDay(e.target.value)
                            }}
                            aria-label="출생 일"
                            required
                        >
                            <option value="">일</option>

                            {days.map((day) => (
                                <option key={day} value={day}>
                                    {day}일
                                </option>
                            ))}
                        </select>
                    </div>

                    {isBirthComplete && !isBirthValid && (
                        <small style={{ color: '#e26b79' }}>
                            생년월일은 오늘 이전 또는 오늘 날짜로 선택해 주세요.
                        </small>
                    )}

                    {/* 설별 */}
                    <label>성별 (선택)</label>
                    <div className="gender-row">
                        <button
                            type="button"
                            className={gender === 'male' ? 'selected' : ''}
                            aria-pressed={gender === 'male'}
                            onClick={() =>
                                setGender(gender === 'male' ? '' : 'male')
                            }
                        >
                            남성
                        </button>

                        <button
                            type="button"
                            className={gender === 'female' ? 'selected' : ''}
                            aria-pressed={gender === 'female'}
                            onClick={() =>
                                setGender(gender === 'female' ? '' : 'female')
                            }
                        >
                            여성
                        </button>

                        <button
                            type="button"
                            className={gender === 'neutral' ? 'selected' : ''}
                            aria-pressed={gender === 'neutral'}
                            onClick={() =>
                                setGender(gender === 'neutral' ? '' : 'neutral')
                            }
                        >
                            중성
                        </button>
                    </div>
                    
                    {/* supabase 회원가입 버튼 */}
                    <button
                        type="submit"
                        disabled={isSubmitting || signupSuccess}
                    >
                        {isSubmitting
                            ? '회원가입 처리 중...'
                            : signupSuccess
                                ? '회원가입 요청 완료'
                                : '회원가입'
                        }
                    </button>

                    {/* 회원강비 결과 메시지 */}
                    {signupMessage && (
                        <small role="status">
                            {signupMessage}
                        </small>
                    )}
                </form>
            </section>
        </main>
    )
}

export default SignupPage