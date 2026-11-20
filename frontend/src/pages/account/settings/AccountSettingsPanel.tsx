import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import './AccountSettingsPanel.css'

export default function AccountSettingsPanel({ email, emailConfirmed }: { email?: string; emailConfirmed: boolean }) {
    const [pending, setPending] = useState(false)
    const [notice, setNotice] = useState('')

    // ⭐ 현재 비밀번호를 확인하고 새 비밀번호 저장
    async function changePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (pending) return

        const form = event.currentTarget
        const values = new FormData(form)
        const currentPassword = String(values.get('currentPassword') ?? '')
        const newPassword = String(values.get('newPassword') ?? '')

        if (newPassword !== values.get('confirmation')) {
            setNotice('새 비밀번호와 비밀번호 확인이 일치하지 않아요.')
            return
        }

        setPending(true)
        setNotice('')
        try {
            const { error } = await supabase.auth.updateUser({
                current_password: currentPassword,
                password: newPassword,
            })

            if (error) {
                setNotice(error.code === 'invalid_credentials'
                    ? '현재 비밀번호를 다시 확인해 주세요.'
                    : '비밀번호를 변경하지 못했어요. 새 비밀번호 조건을 확인한 뒤 다시 시도해 주세요.')
                return
            }

            form.reset()
            setNotice('비밀번호를 변경했어요.')
        } catch {
            setNotice('연결을 확인한 뒤 다시 시도해 주세요.')
        } finally {
            setPending(false)
        }
    }

    // ⭐ 현재 브라우저의 로그인 세션 종료
    async function signOut() {
        if (pending) return
        setPending(true)
        setNotice('')
        try {
            const { error } = await supabase.auth.signOut({ scope: 'local' })
            if (error) setNotice('로그아웃에 실패했어요. 다시 시도해 주세요.')
        } catch {
            setNotice('연결을 확인한 뒤 다시 시도해 주세요.')
        } finally {
            setPending(false)
        }
    }

    return (
        <div className="account-settings-panel">
            <section className="account-settings-section">
                <h2>로그인 이메일</h2>
                <p>{email ?? '등록된 이메일이 없어요.'}</p>
                {email && <p>{emailConfirmed ? '이메일 인증 완료' : '이메일 미인증'}</p>}
            </section>

            <section className="account-settings-section">
                <h2>비밀번호 변경</h2>
                <form onSubmit={changePassword}>
                    <label>
                        현재 비밀번호
                        <input name="currentPassword" type="password" autoComplete="current-password" required />
                    </label>
                    <label>
                        새 비밀번호 (8~64자)
                        <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={64} required />
                    </label>
                    <label>
                        새 비밀번호 확인
                        <input name="confirmation" type="password" autoComplete="new-password" required />
                    </label>
                    <button className="mypage-action" type="submit" disabled={pending}>비밀번호 변경</button>
                </form>
            </section>

            <button className="mypage-action" type="button" disabled={pending} onClick={signOut}>이 기기에서 로그아웃</button>
            <p role="status" className="account-settings-notice">{notice}</p>
        </div>
    )
}
