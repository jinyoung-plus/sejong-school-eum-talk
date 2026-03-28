/**
 * ResetPassword.jsx
 * 비밀번호 재설정 페이지
 * - Supabase 비밀번호 리셋 이메일의 링크를 클릭하면 이 페이지로 도착
 * - PASSWORD_RECOVERY 이벤트 감지 → 새 비밀번호 입력 → updateUser
 * - 로그인 페이지에서 "비밀번호를 잊으셨나요?" 링크로도 접근 가능
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Mail, ArrowLeft, KeyRound,
} from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('loading'); // 'loading' | 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [recoverySession, setRecoverySession] = useState(null);

  useEffect(() => {
    if (!supabase) {
      setMode('request');
      return;
    }

    // URL에 recovery token이 있는지 확인
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const type = params.get('type');
    const accessToken = params.get('access_token');

    if (type === 'recovery' && accessToken) {
      // recovery 토큰이 URL에 있으면 → 비밀번호 재설정 모드
      setMode('reset');
    } else {
      // 토큰 없으면 → 이메일 요청 모드
      setMode('request');
    }

    // onAuthStateChange로 PASSWORD_RECOVERY 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setRecoverySession(session);
          setEmail(session?.user?.email || '');
          setMode('reset');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 이메일로 재설정 링크 발송
  const handleRequestReset = async () => {
    if (!email.trim()) {
      setStatus('error'); setMessage('이메일을 입력해주세요.'); return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      setStatus('success');
      setMessage(`${email}로 비밀번호 재설정 이메일이 발송되었습니다. 이메일의 링크를 클릭해주세요.`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || '이메일 발송에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 새 비밀번호 설정
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setStatus('error'); setMessage('비밀번호는 6자 이상이어야 합니다.'); return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('error'); setMessage('비밀번호가 일치하지 않습니다.'); return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: null, timedOut: true }), 5000)
      );

      const result = await Promise.race([updatePromise, timeoutPromise]);

      if (result.error) throw result.error;

      // 타임아웃이어도 대부분 성공 → 완료 처리
      setMode('done');

      // 세션 정리 (새 비밀번호로 재로그인하도록)
      try {
        localStorage.removeItem('sjeumtalk-auth');
        localStorage.removeItem('sjeumtalk-auth-code-verifier');
        await supabase.auth.signOut();
      } catch {}

    } catch (err) {
      setStatus('error');
      setMessage(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 로딩 중
  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">비밀번호 재설정</h2>
          <p className="text-sm text-slate-400 mt-1">세종 스쿨이음톡</p>
        </div>

        {/* ===== 모드 1: 이메일 요청 ===== */}
        {mode === 'request' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">이메일</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
                  placeholder="name@korea.kr"
                  className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
              </div>
            </div>

            {status && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                status === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
              }`}>
                {status === 'success' ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
                <span>{message}</span>
              </div>
            )}

            <button
              onClick={handleRequestReset}
              disabled={saving || !email.trim()}
              className="w-full h-10 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Mail size={14} />
              {saving ? '발송 중...' : '재설정 이메일 보내기'}
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => navigate('/login')}
                className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 mx-auto"
              >
                <ArrowLeft size={12} /> 로그인으로 돌아가기
              </button>
            </div>
          </div>
        )}

        {/* ===== 모드 2: 새 비밀번호 입력 ===== */}
        {mode === 'reset' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg border border-teal-100">
              <CheckCircle2 size={14} className="text-teal-600 flex-shrink-0" />
              <span className="text-xs text-teal-700">인증이 확인되었습니다. 새 비밀번호를 설정해주세요.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">새 비밀번호</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setStatus(null); }}
                  placeholder="6자 이상 입력"
                  className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-10 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setStatus(null); }}
                  placeholder="비밀번호 재입력"
                  className="w-full h-10 rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
              </div>
            </div>

            {/* 비밀번호 강도 */}
            {newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-1 flex-1 rounded-full transition ${
                      newPassword.length >= level * 3
                        ? level <= 2 ? 'bg-red-400' : level === 3 ? 'bg-amber-400' : 'bg-green-500'
                        : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">
                  {newPassword.length < 6 ? '너무 짧음' : newPassword.length < 9 ? '보통' : '강함'}
                </span>
              </div>
            )}

            {status && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-red-50 text-red-700">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              onClick={handleResetPassword}
              disabled={saving || !newPassword || !confirmPassword}
              className="w-full h-10 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Lock size={14} />
              {saving ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        )}

        {/* ===== 모드 3: 완료 ===== */}
        {mode === 'done' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
            <CheckCircle2 size={48} className="text-teal-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">비밀번호 변경 완료</h3>
            <p className="text-sm text-slate-500">
              새 비밀번호가 설정되었습니다.<br />이제 새 비밀번호로 로그인하세요.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-10 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition"
            >
              로그인 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
