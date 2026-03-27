import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        storageKey: 'sjeumtalk-auth',
      },
    })
  : null;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// 기존 storageKey 세션 정리 (한번만 실행)
try {
  const oldKey = 'sejong-school-eum-talk-auth';
  if (localStorage.getItem(oldKey)) {
    localStorage.removeItem(oldKey);
    localStorage.removeItem(oldKey + '-code-verifier');
  }
} catch {}