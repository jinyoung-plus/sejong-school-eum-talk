import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const isSigningUp = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] getSession →', session ? `유저=${session.user.email}, id=${session.user.id}` : '세션 없음');
      console.log('[Auth] user_metadata:', session?.user?.user_metadata);

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event);
        if (event === 'INITIAL_SESSION') return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
        } else {
          setUser(null);
          setRole('public');
          setDisplayName('');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId, email, metadata) {
    console.log('[Auth] fetchProfile 시작:', { userId, email });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, display_name, email')
        .eq('user_id', userId)
        .single();

      console.log('[Auth] profiles 조회:', { data, error: error?.message || null });

      if (data) {
        if (data.role) {
          setRole(data.role);
          console.log('[Auth] ✅ role (DB):', data.role);
        } else if (email?.endsWith('@korea.kr')) {
          setRole('staff');
          console.log('[Auth] ✅ role (도메인 폴백): staff');
        } else {
          console.log('[Auth] ⚠️ role 없음, public 유지');
        }

        if (data.display_name) {
          setDisplayName(data.display_name);
          console.log('[Auth] ✅ displayName (DB):', data.display_name);
        } else if (metadata?.display_name) {
          setDisplayName(metadata.display_name);
          console.log('[Auth] ✅ displayName (metadata 폴백):', metadata.display_name);
        } else {
          console.log('[Auth] ⚠️ displayName 없음 → 이메일 앞부분 폴백');
        }
        return;
      }

      // data가 null — 프로필 행 없음
      console.warn('[Auth] ⚠️ 프로필 행 없음!', error?.message);

      if (isSigningUp.current) {
        applyFallback(email, metadata);
        return;
      }

      // 재시도
      console.log('[Auth] 1.5초 후 재시도...');
      await new Promise(r => setTimeout(r, 1500));
      const { data: retryData, error: retryError } = await supabase
        .from('profiles')
        .select('role, display_name, email')
        .eq('user_id', userId)
        .single();

      console.log('[Auth] 재시도 결과:', { retryData, retryError: retryError?.message || null });

      if (retryData) {
        if (retryData.role) setRole(retryData.role);
        else if (email?.endsWith('@korea.kr')) setRole('staff');
        if (retryData.display_name) setDisplayName(retryData.display_name);
        else if (metadata?.display_name) setDisplayName(metadata.display_name);
        return;
      }

      if (isSigningUp.current) {
        applyFallback(email, metadata);
        return;
      }

      // 프로필 없음 → 탈퇴 계정 처리
      console.warn('[Auth] ❌ 프로필 없음 (재시도 실패) → 탈퇴 처리');
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
      console.error('[Auth] ❌ fetchProfile 예외:', err.message);
      applyFallback(email, metadata);
    }
  }

  function applyFallback(email, metadata) {
    console.log('[Auth] 폴백 적용:', { email, metadata });
    if (metadata?.role) setRole(metadata.role);
    else if (email?.endsWith('@korea.kr')) setRole('staff');
    else setRole('public');

    if (metadata?.display_name) setDisplayName(metadata.display_name);
    else setDisplayName('');
  }

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

    isSigningUp.current = true;

    const domain = email.split('@')[1];
    const userRole = domain === 'korea.kr' ? 'staff' : 'public';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayNameInput, role: userRole },
      },
    });

    if (error?.message?.includes('already registered')) {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email, password,
      });

      if (loginError) {
        isSigningUp.current = false;
        return { user: null, error: { message: '이미 등록된 이메일입니다. 기존 비밀번호로 로그인해주세요.' } };
      }

      if (loginData?.user) {
        await supabase.from('profiles').upsert({
          user_id: loginData.user.id,
          email: email,
          role: userRole,
          display_name: displayNameInput,
        });
        isSigningUp.current = false;
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

    isSigningUp.current = false;
    return { user: data?.user, error: null };
  }

  async function signOut() {
    setUser(null);
    setRole('public');
    setDisplayName('');

    try {
      localStorage.removeItem('sjeumtalk-auth');
      localStorage.removeItem('sjeumtalk-auth-code-verifier');
    } catch {}

    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch {}
    }
  }

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
