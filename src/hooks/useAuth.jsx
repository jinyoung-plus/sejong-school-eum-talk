import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

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
    // 매번 DB에서 최신 정보를 가져옴 (캐시 사용 안 함)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, display_name')
        .eq('user_id', userId)
        .single();

      if (data) {
        if (data.role) setRole(data.role);
        if (data.display_name) setDisplayName(data.display_name);
        return; // DB에서 성공적으로 가져왔으므로 여기서 끝
      }
    } catch (err) {
      console.warn('[useAuth] profiles 조회 실패:', err.message);
    }

    // DB 실패 시에만 fallback
    if (email?.endsWith('@korea.kr')) setRole('staff');
    else setRole('public');
    setDisplayName(''); // 빈 값 → resolvedName에서 email 앞부분 사용
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

    const domain = email.split('@')[1];
    const userRole = domain === 'korea.kr' ? 'staff' : 'public';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayNameInput, role: userRole },
      },
    });

    if (data?.user && !error) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        email: email,
        role: userRole,
        display_name: displayNameInput,
      });
    }

    return { user: data?.user, error };
  }

  async function signOut() {
    setUser(null);
    setRole('public');
    setDisplayName('');
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
