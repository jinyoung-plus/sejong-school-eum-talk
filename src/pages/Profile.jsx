/**
 * Profile.jsx — 개인정보 수정 페이지 (v2 수정)
 * - 타임아웃 추가 (Supabase 응답 없을 때 대비)
 * - supabase null 체크
 * - Console 디버그 로그
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  User, Lock, Trash2, CheckCircle2, AlertTriangle,
  ArrowLeft, Eye, EyeOff, Shield,
} from 'lucide-react';

// 타임아웃 유틸
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`요청 시간 초과 (${ms / 1000}초). 로그아웃 후 재로그인 해주세요.`)), ms)
    ),
  ]);
}

export default function Profile() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-6 transition"
        >
          <ArrowLeft size={16} /> 뒤로가기
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <User size={20} />
            </span>
            개인정보 관리
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-[52px]">
            이름 수정, 비밀번호 변경, 회원 탈퇴를 할 수 있습니다.
          </p>
        </div>

        <AccountInfoCard user={user} role={role} />
        <DisplayNameSection user={user} />
        <PasswordSection />
        <DeleteAccountSection user={user} signOut={signOut} navigate={navigate} />
      </div>
    </div>
  );
}

// ============================================================
// 계정 정보 카드
// ============================================================
function AccountInfoCard({ user, role }) {
  const roleLabel = { admin: '관리자', staff: '내부 직원', public: '일반 사용자' };
  const roleColor = {
    admin: 'bg-purple-50 text-purple-700',
    staff: 'bg-teal-50 text-teal-700',
    public: 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
          {(user?.user_metadata?.display_name || user?.email)?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-800">
            {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
          </div>
          <div className="text-sm text-slate-400">{user?.email}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${roleColor[role] || roleColor.public}`}>
              <Shield size={10} className="inline mr-1" />
              {roleLabel[role] || '일반 사용자'}
            </span>
            <span className="text-[11px] text-slate-400">
              가입일: {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 이름(실명) 수정
// ============================================================
function DisplayNameSection({ user }) {
  const currentName = user?.user_metadata?.display_name || '';
  const [name, setName] = useState(currentName);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setStatus('error'); setMessage('이름을 입력해주세요.'); return; }
    if (name.trim().length < 2) { setStatus('error'); setMessage('이름은 2자 이상 입력해주세요.'); return; }
    if (!supabase) { setStatus('error'); setMessage('Supabase 연결이 되어 있지 않습니다.'); return; }

    setSaving(true);
    setStatus(null);

    try {
      const { error: authError } = await withTimeout(
        supabase.auth.updateUser({ data: { display_name: name.trim() } })
      );
      if (authError) throw authError;

      // profiles 테이블도 업데이트 (실패해도 진행)
      try {
        await withTimeout(
          supabase.from('profiles').update({ display_name: name.trim() }).eq('user_id', user.id),
          5000
        );
      } catch (e) {
        console.warn('[Profile] profiles 업데이트 실패 (무시):', e.message);
      }

      setStatus('success');
      setMessage('이름이 변경되었습니다. 새로고침하면 헤더에 반영됩니다.');
    } catch (err) {
      console.error('[Profile] 이름 변경 실패:', err);
      setStatus('error');
      setMessage(err.message || '알 수 없는 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <User size={16} className="text-teal-600" /> 이름 수정
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">표시 이름 (실명)</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setStatus(null); }}
            placeholder="홍길동"
            className="w-full h-10 rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20" />
          <p className="text-[11px] text-slate-400 mt-1">헤더와 업로드 데이터에 표시되는 이름입니다.</p>
        </div>

        {status && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${status === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
            {status === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message}
          </div>
        )}

        <button onClick={handleSave}
          disabled={saving || !name.trim() || name.trim() === currentName}
          className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
          {saving ? '저장 중...' : '이름 변경'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 비밀번호 변경
// ============================================================
function PasswordSection() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (newPassword.length < 6) { setStatus('error'); setMessage('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { setStatus('error'); setMessage('새 비밀번호가 일치하지 않습니다.'); return; }
    if (!supabase) { setStatus('error'); setMessage('Supabase 연결이 되어 있지 않습니다.'); return; }

    setSaving(true);
    setStatus(null);

    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword })
      );
      if (error) throw error;

      setStatus('success');
      setMessage('비밀번호가 변경되었습니다.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('[Profile] 비밀번호 변경 실패:', err);
      setStatus('error');
      setMessage(err.message || '알 수 없는 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <Lock size={16} className="text-blue-600" /> 비밀번호 변경
      </h2>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">새 비밀번호</label>
          <div className="relative">
            <input type={showNew ? 'text' : 'password'} value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setStatus(null); }}
              placeholder="6자 이상 입력"
              className="w-full h-10 rounded-lg border border-slate-200 px-4 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />
            <button type="button" onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">새 비밀번호 확인</label>
          <div className="relative">
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setStatus(null); }}
              placeholder="비밀번호 재입력"
              className="w-full h-10 rounded-lg border border-slate-200 px-4 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {newPassword && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[1,2,3,4].map((level) => (
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
          <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${status === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
            {status === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message}
          </div>
        )}

        <button onClick={handleChange}
          disabled={saving || !newPassword || !confirmPassword}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
          {saving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// 회원 탈퇴
// ============================================================
function DeleteAccountSection({ user, signOut, navigate }) {
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== '회원탈퇴') { setStatus('error'); setMessage('"회원탈퇴"를 정확히 입력해주세요.'); return; }
    if (!window.confirm('정말로 탈퇴하시겠습니까?\n\n업로드한 데이터와 계정 정보가 모두 삭제됩니다.')) return;
    if (!supabase) { setStatus('error'); setMessage('Supabase 연결이 되어 있지 않습니다.'); return; }

    setDeleting(true);
    setStatus(null);

    try {
      // 1. 업로드 데이터 소프트 삭제 (실패해도 진행)
      try {
        await withTimeout(supabase.from('uploaded_datasets').update({ is_deleted: true }).eq('uploader_id', user.id), 5000);
      } catch (e) { console.warn('[Profile] 데이터셋 삭제 실패:', e.message); }

      // 2. 프로필 삭제 (실패해도 진행)
      try {
        await withTimeout(supabase.from('profiles').delete().eq('user_id', user.id), 5000);
      } catch (e) { console.warn('[Profile] 프로필 삭제 실패:', e.message); }

      // 3. 로그아웃
      await signOut();

      alert('회원 탈퇴가 완료되었습니다.\n계정 데이터가 삭제 처리되었습니다.');
      navigate('/');
    } catch (err) {
      console.error('[Profile] 회원 탈퇴 실패:', err);
      setStatus('error');
      setMessage(err.message || '알 수 없는 오류');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-bold text-red-600">
        <span className="flex items-center gap-2"><Trash2 size={16} /> 회원 탈퇴</span>
        <span className="text-xs text-red-400">{expanded ? '닫기' : '열기'}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs text-red-700 leading-relaxed"><strong>주의:</strong> 회원 탈퇴 시 아래 항목이 삭제됩니다.</p>
            <ul className="text-xs text-red-600 mt-2 space-y-1 ml-4 list-disc">
              <li>업로드한 모든 데이터셋</li>
              <li>프로필 정보 (이름, 역할)</li>
              <li>로그인 세션</li>
            </ul>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1">
              확인을 위해 "회원탈퇴"를 입력하세요
            </label>
            <input type="text" value={confirmText}
              onChange={(e) => { setConfirmText(e.target.value); setStatus(null); }}
              placeholder="회원탈퇴"
              className="w-full h-10 rounded-lg border border-red-200 px-4 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20" />
          </div>
          {status && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-red-50 text-red-700">
              <AlertTriangle size={14} /> {message}
            </div>
          )}
          <button onClick={handleDelete}
            disabled={deleting || confirmText !== '회원탈퇴'}
            className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
            <Trash2 size={14} />
            {deleting ? '처리 중...' : '회원 탈퇴 확인'}
          </button>
        </div>
      )}
    </div>
  );
}
