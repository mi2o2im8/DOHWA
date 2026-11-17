// 회원가입

import { useState } from "react"

import './SignupPage.css'

function SignupPage(){

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

    const resetEmailVerification = () => {
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
    const handleRequestVerification = () => {
        if (!isEmailValid) return

        setVerificationEmail(email)
        setVerificationCode('')
        setEmailMessage('백엔드 연결 후 인증 메일을 발송할 수 있습니다.')

        window.alert('아직 이메일 발송 기능이 연결되지 않았습니다.')
    }

    // 이메일 인증번호 확인
    const handleVerifyEmail = () => {
        if (
            !isEmailValid ||
            verificationEmail !== email ||
            !verificationCode.trim()
        ) return

        setEmailMessage('백엔드 연결 후 인증번호를 확인할 수 있습니다.')
    }

    // 닉네임 중복 확인: 입력한 경우에만 실행
    const handleCheckNickname = () => {
        if (!nickname.trim()) return

        setNicknameMessage('백엔드 연결 후 중복 여부를 확인할 수 있습니다.')
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

                <form onSubmit={(e) => e.preventDefault()}>
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
                            <option value="daum.com">daum.com</option>
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
                        disabled={!isEmailValid}
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
                                    disabled={!verificationCode.trim()}
                                    onClick={handleVerifyEmail}
                                >
                                    인증확인
                                </button>
                            </div>

                            <small role="status">{emailMessage}</small>
                        </>
                    )}

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

                    <button type="submit" disabled>
                        회원가입 (준비 중)
                    </button>
                </form>
            </section>
        </main>
    )
}

export default SignupPage