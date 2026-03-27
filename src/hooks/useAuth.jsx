import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('public');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRole(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchRole(session.user.id, session.user.email);
        } else {
          setUser(null);
          setRole('public');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId, email) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (data?.role) {
        setRole(data.role);
        return;
      }
    } catch {}
    if (email?.endsWith('@korea.kr')) {
      setRole('staff');
      return;
    }
    setRole('public');
  }

  async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
      const isStaff = email.endsWith('@korea.kr');
      setUser({ email, id: 'local-dev' });
      setRole(isStaff ? 'staff' : 'public');
      return { user: { email }, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data?.user, error };
  }

  async function signUp(email, password, displayName) {
    if (!isSupabaseConfigured()) {
      return { user: null, error: { message: 'Supabase 미설정' } };
    }

    const domain = email.split('@')[1];
    const userRole = domain === 'korea.kr' ? 'staff' : 'public';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role: userRole },
      },
    });

    if (data?.user && !error) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        role: userRole,
        display_name: displayName,
      });
    }

    return { user: data?.user, error };
  }

  async function signOut() {
    setUser(null);
    setRole('public');
    if (isSupabaseConfigured()) {
      try { await supabase.auth.signOut(); } catch {}
    }
  }

  const value = {
    user,
    role,
    loading,
    isStaff: role === 'staff' || role === 'admin',
    isAdmin: role === 'admin',
    signIn,
    signUp,
    signOut,
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
