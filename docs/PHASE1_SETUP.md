# Phase 1: Supabase DB 연결 + 데이터 적재 가이드

## 📋 진행 순서

### 1단계: Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속 → **New Project** 생성
2. 프로젝트 이름: `sejong-school-eum-talk`
3. DB 비밀번호 설정 (안전한 비밀번호 사용)
4. Region: **Northeast Asia (Tokyo)** 선택 (한국에서 가장 가까움)
5. 생성 완료 후 **Settings > API**에서 아래 정보 복사:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 2단계: 환경변수 설정

프로젝트 루트의 `.env.local` 파일에 키 입력:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi.....
```

### 3단계: 테이블 생성 (SQL 실행)

1. Supabase Dashboard → **SQL Editor** 클릭
2. **New Query** 생성
3. `supabase/migrations/001_create_tables.sql` 파일 내용을 **전체 복사하여 붙여넣기**
4. **Run** 클릭
5. 성공 메시지 확인

> ⚠️ 이 SQL은 아래를 한번에 생성합니다:
> - 6개 테이블 (profiles, schools, school_contacts, uploaded_datasets, student_transfers, yearly_statistics)
> - RLS 정책 (공개/내부 접근 제어)
> - 인덱스
> - Auth 트리거 (회원가입 시 자동 역할 부여)
> - Storage 버킷 (파일 업로드용)

### 4단계: 173개교 데이터 시딩

1. SQL Editor에서 **New Query** 생성
2. `supabase/migrations/002_seed_schools.sql` 파일 내용을 **전체 복사하여 붙여넣기**
3. **Run** 클릭
4. 결과 확인: schools 173건, school_contacts 173건

### 5단계: 데이터 확인

SQL Editor에서 확인 쿼리 실행:

```sql
-- 전체 학교 수 확인
SELECT type, COUNT(*) FROM schools GROUP BY type ORDER BY COUNT(*) DESC;

-- 연락처 수 확인
SELECT COUNT(*) FROM school_contacts;

-- RLS 테스트 (비로그인 상태에서 연락처 접근 불가 확인)
-- Dashboard > Table Editor > school_contacts에서 데이터가 보이지 않으면 정상
```

### 6단계: Auth 설정

Supabase Dashboard → **Authentication > Providers**:

1. **Email** 활성화 (기본 활성화)
2. **Confirm email** 옵션:
   - 개발 중: OFF (이메일 인증 없이 바로 로그인)
   - 운영 시: ON (실제 이메일 인증 필요)
3. **Site URL**: `http://localhost:3000` (개발) / 배포 URL (운영)

### 7단계: 앱 실행 및 테스트

```bash
npm run dev
```

테스트 시나리오:

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| 공개 데이터 | 비로그인 상태로 홈 접속 | 173교, KPI 카드 표시 |
| 회원가입 | 아무 이메일로 가입 | role: 'public' 부여 |
| 직원 가입 | test@korea.kr로 가입 | role: 'staff' 부여 |
| 연락처 접근 | staff 로그인 → 학교 상세 | 교장/교감/행정실장 연락처 표시 |
| 연락처 차단 | 비로그인 → 학교 상세 | "내부 직원 전용" 잠금 |
| 데이터 관리 | staff 로그인 → 데이터 메뉴 | 업로드 화면 표시 |
| 데이터 차단 | 비로그인 → 데이터 메뉴 | 로그인 요구 화면 |

---

## 🔧 트러블슈팅

### "relation does not exist" 에러
→ 001_create_tables.sql을 아직 실행하지 않았습니다.

### RLS 정책 에러
→ profiles 테이블이 먼저 존재해야 합니다. 001 SQL을 순서대로 실행하세요.

### Storage 버킷 생성 실패
→ Supabase Dashboard > Storage에서 수동으로 `uploads` 버킷을 생성할 수 있습니다.

### 로그인 후에도 연락처가 안 보임
→ SQL Editor에서 해당 유저의 profile role을 확인하세요:
```sql
SELECT * FROM profiles WHERE email = 'your@email.com';
```

### 로컬에서 Supabase 없이도 동작하나요?
→ 네. `.env.local`에 키를 설정하지 않으면 자동으로 로컬 JSON fallback 모드로 동작합니다.
