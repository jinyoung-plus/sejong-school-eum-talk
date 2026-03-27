import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // 이미 로그인된 경우
  if (user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 text-center">
        <CheckCircle size={48} className="mx-auto text-primary-500 mb-4" />
        <h2 className="text-xl font-bold text-navy-700 mb-2">로그인됨</h2>
        <p className="text-sm text-navy-400 mb-4">{user.email}</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          홈으로 이동
        </button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { user: loggedIn, error: err } = await signIn(email, password);
        if (err) throw err;
        if (loggedIn) navigate('/');
      } else {
        if (!displayName.trim()) {
          throw { message: '이름을 입력해주세요.' };
        }
        const { user: created, error: err } = await signUp(email, password, displayName);
        if (err) throw err;
        setSuccess('가입 완료! 이메일을 확인하고 인증 링크를 클릭해주세요.');
      }
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const isKoreaKr = email.endsWith('@korea.kr');

  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-white font-black text-sm">이음</span>
          </div>
          <h2 className="text-xl font-bold text-navy-700">세종 스쿨이음톡</h2>
          <p className="text-sm text-navy-400 mt-1">
            {mode === 'login' ? '로그인' : '회원가입'}
          </p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {/* 회원가입: 이름 */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-navy-500 mb-1.5">이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="홍길동"
                className="input-field"
              />
            </div>
          )}

          {/* 이메일 */}
          <div>
            <label className="block text-xs font-semibold text-navy-500 mb-1.5">이메일</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@korea.kr"
                className="input-field pl-10"
                required
              />
            </div>
            {email && (
              <p className={`text-[11px] mt-1 flex items-center gap-1 ${isKoreaKr ? 'text-primary-500' : 'text-navy-400'}`}>
                {isKoreaKr ? (
                  <>
                    <CheckCircle size={11} />
                    교육청 직원 계정 — 내부 기능 이용 가능
                  </>
                ) : (
                  <>
                    <AlertCircle size={11} />
                    일반 계정 — 공개 기능만 이용 가능
                  </>
                )}
              </p>
            )}
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-navy-500 mb-1.5">비밀번호</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="input-field pl-10 pr-10"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* 에러/성공 메시지 */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-600 text-xs">
              <CheckCircle size={14} />
              {success}
            </div>
          )}

          {/* 제출 */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                처리 중...
              </span>
            ) : (
              <>
                <LogIn size={16} />
                {mode === 'login' ? '로그인' : '가입하기'}
              </>
            )}
          </button>

          {/* 전환 */}
          <p className="text-center text-xs text-navy-400">
            {mode === 'login' ? (
              <>
                계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-primary-500 font-semibold hover:underline"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-primary-500 font-semibold hover:underline"
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </form>

        {/* 개발 모드 안내 */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[11px] text-amber-700">
            <strong>개발 모드:</strong> Supabase 미설정 시 아무 이메일로 로그인 가능합니다.
            @korea.kr로 끝나는 이메일은 직원 권한이 부여됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
