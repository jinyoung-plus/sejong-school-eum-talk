/**
 * Profile.jsx — 개인정보 수정 페이지 (v3)
 * - 이름 변경: profiles 테이블 직접 UPDATE (auth.updateUser 사용 안 함)
 * - 비밀번호: 재설정 이메일 발송 방식
 * - 회원 탈퇴: profiles 삭제 + 데이터 비활성화
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  User, Lock, Trash2, CheckCircle2, AlertTriangle,
  ArrowLeft, Shield, Mail,
} from 'lucide-react';

export default function Profile() {
  const { user, role, displayName, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-6 transition">
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

        <AccountInfoCard user={user} role={role} displayName={displayName} />
        <DisplayNameSection user={user} currentName={displayName} />
        <PasswordSection userEmail={user?.email} />
        <DeleteAccountSection user={user} signOut={signOut} navigate={navigate} />
      </div>
    </div>
  );
}

// ============================================================
// 계정 정보 카드
// ============================================================
function AccountInfoCard({ user, role, displayName }) {
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
          {(displayName || 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-lg font-bold text-slate-800">{displayName || '사용자'}</div>
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
// 이름(실명) 수정 — profiles 테이블 직접 사용
// ============================================================
function DisplayNameSection({ user, currentName }) {
  const { updateDisplayName } = useAuth();
  const [name, setName] = useState(currentName || '');
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setStatus('error'); setMessage('이름을 입력해주세요.'); return; }
    if (name.trim().length < 2) { setStatus('error'); setMessage('이름은 2자 이상 입력해주세요.'); return; }

    setSaving(true);
    setStatus(null);

    try {
      const result = await updateDisplayName(name.trim());
      if (result.error) throw new Error(result.error);

      setStatus('success');
      setMessage('이름이 변경되었습니다. 헤더에 바로 반영됩니다.');
    } catch (err) {
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
// 비밀번호 변경 — 리셋 이메일 발송 방식
// ============================================================
function PasswordSection({ userEmail }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleReset = async () => {
    if (!supabase) { setStatus('error'); setMessage('Supabase 연결이 되어 있지 않습니다.'); return; }

    setSending(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      setStatus('success');
      setMessage(`비밀번호 재설정 이메일이 ${userEmail}로 발송되었습니다. 이메일을 확인해주세요.`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || '이메일 발송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <Lock size={16} className="text-blue-600" /> 비밀번호 변경
      </h2>
      <div className="space-y-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          비밀번호 변경을 위해 등록된 이메일로 재설정 링크를 보내드립니다.
        </p>

        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <Mail size={14} className="text-slate-400" />
          <span className="text-sm text-slate-600">{userEmail}</span>
        </div>

        {status && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${status === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
            {status === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {message}
          </div>
        )}

        <button onClick={handleReset}
          disabled={sending}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
          <Mail size={14} />
          {sending ? '발송 중...' : '비밀번호 재설정 이메일 보내기'}
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
        await supabase.from('uploaded_datasets').update({ is_deleted: true }).eq('uploader_id', user.id);
      } catch (e) { console.warn('데이터셋 삭제 실패:', e.message); }

      // 2. 프로필 삭제 (실패해도 진행)
      try {
        await supabase.from('profiles').delete().eq('user_id', user.id);
      } catch (e) { console.warn('프로필 삭제 실패:', e.message); }

      // 3. 로그아웃
      await signOut();

      alert('회원 탈퇴가 완료되었습니다.\n계정 데이터가 삭제 처리되었습니다.');
      navigate('/');
    } catch (err) {
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
