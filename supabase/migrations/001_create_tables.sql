-- ============================================================
-- 세종 스쿨이음톡 — Phase 1 마이그레이션
-- Supabase Dashboard > SQL Editor에서 실행
-- ⚠️ 반드시 순서대로 실행하세요 (의존성 있음)
-- ============================================================

-- ============================================================
-- STEP 1: 테이블 생성
-- ============================================================

-- 1. profiles (사용자 역할) — 다른 테이블의 RLS에서 참조하므로 먼저 생성
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT DEFAULT 'public' CHECK (role IN ('public', 'staff', 'admin')),
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. schools (공개)
CREATE TABLE IF NOT EXISTS schools (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT,
  raw_type TEXT,
  seq INTEGER,
  established_date TEXT,
  main_phone TEXT,
  classes_count INTEGER DEFAULT 0,
  special_classes INTEGER DEFAULT 0,
  student_count INTEGER DEFAULT 0,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. school_contacts (내부 전용)
CREATE TABLE IF NOT EXISTS school_contacts (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE UNIQUE NOT NULL,
  principal_name TEXT,
  principal_phone TEXT,
  vice_principal_name TEXT,
  vice_principal_phone TEXT,
  admin_name TEXT,
  admin_phone TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. uploaded_datasets (내부 전용)
CREATE TABLE IF NOT EXISTS uploaded_datasets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_scope TEXT,
  category TEXT NOT NULL,
  reference_date DATE,
  dataset_group_id UUID,
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT TRUE,
  title TEXT NOT NULL,
  description TEXT,
  uploader_id UUID REFERENCES auth.users(id),
  uploader_name TEXT,
  file_path TEXT,
  parsed_data JSONB,
  row_count INTEGER DEFAULT 0,
  column_names JSONB,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. student_transfers (연도별 전출입)
CREATE TABLE IF NOT EXISTS student_transfers (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  transfer_in INTEGER DEFAULT 0,
  transfer_out INTEGER DEFAULT 0,
  net_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year)
);

-- 6. yearly_statistics (교육기본통계)
CREATE TABLE IF NOT EXISTS yearly_statistics (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  student_count INTEGER DEFAULT 0,
  class_count INTEGER DEFAULT 0,
  teacher_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year)
);

-- ============================================================
-- STEP 2: RLS (Row Level Security) 정책
-- ============================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- schools (누구나 읽기)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schools_read_all" ON schools FOR SELECT USING (true);

-- school_contacts (staff/admin만 읽기)
ALTER TABLE school_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_staff_read" ON school_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('staff', 'admin')
    )
  );

-- uploaded_datasets
ALTER TABLE uploaded_datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "datasets_staff_read" ON uploaded_datasets
  FOR SELECT USING (
    NOT is_deleted AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('staff', 'admin'))
  );
CREATE POLICY "datasets_staff_insert" ON uploaded_datasets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('staff', 'admin'))
  );
CREATE POLICY "datasets_owner_update" ON uploaded_datasets
  FOR UPDATE USING (
    auth.uid() = uploader_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
  );

-- student_transfers / yearly_statistics (누구나 읽기)
ALTER TABLE student_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfers_read_all" ON student_transfers FOR SELECT USING (true);
ALTER TABLE yearly_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yearly_stats_read_all" ON yearly_statistics FOR SELECT USING (true);

-- ============================================================
-- STEP 3: 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type);
CREATE INDEX IF NOT EXISTS idx_schools_region ON schools(region);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_contacts_school ON school_contacts(school_id);
CREATE INDEX IF NOT EXISTS idx_datasets_category ON uploaded_datasets(category);
CREATE INDEX IF NOT EXISTS idx_datasets_group ON uploaded_datasets(dataset_group_id);
CREATE INDEX IF NOT EXISTS idx_datasets_latest ON uploaded_datasets(is_latest) WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_transfers_school ON student_transfers(school_id);
CREATE INDEX IF NOT EXISTS idx_yearly_school ON yearly_statistics(school_id);

-- ============================================================
-- STEP 4: Auth 트리거 — 회원가입 시 profiles 자동 생성
-- @korea.kr → 'staff', 그 외 → 'public'
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_display_name TEXT;
BEGIN
  IF NEW.email LIKE '%@korea.kr' THEN
    user_role := 'staff';
  ELSE
    user_role := 'public';
  END IF;

  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (user_id, role, display_name, email)
  VALUES (NEW.id, user_role, user_display_name, NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 5: Storage 버킷
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 'uploads', false, 10485760,
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/vnd.ms-excel']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "uploads_staff_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('staff','admin'))
  );
CREATE POLICY "uploads_staff_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('staff','admin'))
  );

-- ✅ 완료! 다음: 002_seed_schools.sql 실행
