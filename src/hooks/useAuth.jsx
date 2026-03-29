import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const isSigningUp = useRef(false);
  const profileFetched = useRef(false);   // 중복 호출 방지

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // onAuthStateChange가 모든 이벤트를 처리 (getSession 별도 호출 불필요)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] onAuthStateChange:', event);

        if (session?.user) {
          setUser(session.user);

          // INITIAL_SESSION 또는 SIGNED_IN에서 한 번만 프로필 가져오기
          if (!profileFetched.current) {
            profileFetched.current = true;
            await fetchProfile(session.user.id, session.user.email, session.user.user_metadata);
          }
        } else {
          setUser(null);
          setRole('public');
          setDisplayName('');
          profileFetched.current = false;
        }

        setLoading(false);
      }
    );

    // 안전장치: 3초 안에 onAuthStateChange가 안 오면 loading 해제
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // profiles 테이블에서 role + display_name 가져오기
  async function fetchProfile(userId, email, metadata) {
    console.log('[Auth] fetchProfile 시작:', { userId, email });

    // 1단계: 타임아웃 포함 profiles 조회 (5초 제한)
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('role, display_name, email')
          .eq('user_id', userId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('타임아웃(5초)')), 5000)
        ),
      ]);

      const { data, error } = result;
      console.log('[Auth] profiles 조회 결과:', { data, error: error?.message || null });

      if (data) {
        if (data.role) {
          setRole(data.role);
          console.log('[Auth] ✅ role (DB):', data.role);
        } else {
          applyRoleFallback(email, metadata);
        }

        if (data.display_name) {
          setDisplayName(data.display_name);
          console.log('[Auth] ✅ displayName (DB):', data.display_name);
        } else {
          applyNameFallback(metadata);
        }
        return;
      }

      // data가 null — 프로필 행 없음
      if (error) {
        console.warn('[Auth] ⚠️ profiles 조회 에러:', error.message);
      }

    } catch (err) {
      // 타임아웃 또는 네트워크 에러
      console.warn('[Auth] ⚠️ profiles 조회 실패:', err.message);
    }

    // 2단계: profiles 조회 실패 시 metadata/이메일 폴백
    console.log('[Auth] 폴백 적용 시작');
    applyRoleFallback(email, metadata);
    applyNameFallback(metadata);

    // 3단계: 프로필이 없는 경우 재시도 (백그라운드, 탈퇴 체크용)
    if (!isSigningUp.current) {
      retryProfileInBackground(userId, email, metadata);
    }
  }

  // 백그라운드에서 프로필 재시도 (UI는 이미 폴백으로 표시 중)
  async function retryProfileInBackground(userId, email, metadata) {
    await new Promise(r => setTimeout(r, 3000));
    console.log('[Auth] 백그라운드 재시도...');

    try {
      const { data } = await Promise.race([
        supabase
          .from('profiles')
          .select('role, display_name')
          .eq('user_id', userId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('재시도 타임아웃')), 5000)
        ),
      ]);

      if (data) {
        console.log('[Auth] ✅ 재시도 성공:', data);
        if (data.role) setRole(data.role);
        if (data.display_name) setDisplayName(data.display_name);
      } else if (!isSigningUp.current) {
        console.warn('[Auth] 재시도 후에도 프로필 없음 — 탈퇴 계정 가능성');
        // 탈퇴 처리는 하지 않음 (폴백으로 이미 동작 중이므로)
      }
    } catch (err) {
      console.warn('[Auth] 재시도 실패:', err.message);
    }
  }

  // role 폴백: metadata > 이메일 도메인
  function applyRoleFallback(email, metadata) {
    if (metadata?.role) {
      setRole(metadata.role);
      console.log('[Auth] ✅ role (metadata 폴백):', metadata.role);
    } else if (email?.endsWith('@korea.kr')) {
      setRole('staff');
      console.log('[Auth] ✅ role (도메인 폴백): staff');
    } else {
      setRole('public');
      console.log('[Auth] role: 기본값 public');
    }
  }

  // displayName 폴백: metadata > (이메일 앞부분은 resolvedName에서 처리)
  function applyNameFallback(metadata) {
    if (metadata?.display_name) {
      setDisplayName(metadata.display_name);
      console.log('[Auth] ✅ displayName (metadata 폴백):', metadata.display_name);
    } else {
      setDisplayName('');
      console.log('[Auth] displayName: 없음 → 이메일 앞부분 폴백');
    }
  }

  // 이름 변경 (profiles 테이블만 사용)
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

    profileFetched.current = false;  // 로그인 시 프로필 다시 가져오기
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
    profileFetched.current = false;

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
    profileFetched.current = false;

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
