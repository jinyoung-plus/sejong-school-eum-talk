import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const isSigningUp = useRef(false);  // ← 추가

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setRole('public');
          setDisplayName('');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // profiles 테이블에서 role + display_name 가져오기
  async function fetchProfile(userId, email) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('user_id', userId)
        .single();

      if (data) {
        if (data.role) setRole(data.role);
        if (data.display_name) setDisplayName(data.display_name);
        return;
      }

      // 가입 중이면 탈퇴 체크 건너뛰기
      if (isSigningUp.current) return;

      // 재시도
      await new Promise(r => setTimeout(r, 1500));
      const { data: retryData } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('user_id', userId)
        .single();

      if (retryData) {
        if (retryData.role) setRole(retryData.role);
        if (retryData.display_name) setDisplayName(retryData.display_name);
        return;
      }

      if (isSigningUp.current) return;  // 재시도 후에도 체크

      // 진짜 탈퇴 계정
      setUser(null);
      setRole('public');
      setDisplayName('');
      try {
        localStorage.removeItem('sjeumtalk-auth');
        localStorage.removeItem('sjeumtalk-auth-code-verifier');
      } catch {}
      try { await supabase.auth.signOut(); } catch {}
      setTimeout(() => {
        alert('탈퇴 처리된 계정입니다. 다시 가입해주세요.');
      }, 100);

    } catch (err) {
      if (email?.endsWith('@korea.kr')) setRole('staff');
      else setRole('public');
      setDisplayName('');
    }
  }

  // 이름 변경 (profiles 테이블만 사용, auth.updateUser 사용 안 함)
  async function updateDisplayName(newName) {
    if (!supabase || !user) return { error: 'Not connected' };
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newName })
        .eq('user_id', user.id);
      if (error) throw error;
      setDisplayName(newName);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      const isStaff = email.endsWith('@korea.kr');
      setUser({ email, id: 'local-dev' });
      setRole(isStaff ? 'staff' : 'public');
      setDisplayName(email.split('@')[0]);
      return { user: { email }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data?.user, error };
  }

  async function signUp(email, password, displayNameInput) {
    if (!isSupabaseConfigured()) {
      return { user: null, error: { message: 'Supabase 미설정' } };
    }

    isSigningUp.current = true;  // ← 추가

    const domain = email.split('@')[1];
    const userRole = domain === 'korea.kr' ? 'staff' : 'public';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayNameInput, role: userRole },
      },
    });

    // "User already registered" → 탈퇴 후 재가입 시도
    if (error?.message?.includes('already registered')) {
      // 로그인 시도 → 성공하면 profile 복원
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email, password,
      });

      if (loginError) {
        return { user: null, error: { message: '이미 등록된 이메일입니다. 기존 비밀번호로 로그인해주세요.' } };
      }

      // 로그인 성공 → profile 복원
      if (loginData?.user) {
        await supabase.from('profiles').upsert({
          user_id: loginData.user.id,
          email: email,
          role: userRole,
          display_name: displayNameInput,
        });
        return { user: loginData.user, error: null };
      }
    }

    if (data?.user && !error) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        email: email,
        role: userRole,
        display_name: displayNameInput,
      });
    }

    isSigningUp.current = false;  // ← 마지막에 추가
    return { user: data?.user || loginData?.user, error: null };
  }

  async function signOut() {
    setUser(null);
    setRole('public');
    setDisplayName('');

    // localStorage에서 세션 직접 삭제 (signOut 실패 대비)
    try {
      localStorage.removeItem('sjeumtalk-auth');
      localStorage.removeItem('sjeumtalk-auth-code-verifier');
    } catch {}

    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch {}
    }
  }

  // displayName 우선순위: Context state > auth metadata > email 앞부분
  const resolvedName = displayName
    || user?.email?.split('@')[0]
    || '';

  const value = {
    user,
    role,
    displayName: resolvedName,
    loading,
    isStaff: role === 'staff' || role === 'admin',
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
    updateDisplayName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
