# 세종 스쿨이음톡 (SejongSchoolEumTalk)

> 부서 간 칸막이를 허무는 학교데이터 원클릭 공유 플랫폼

세종특별자치시교육청 AI 학습동아리에서 개발하는 학교 정보 통합 플랫폼입니다.
173개 학교의 데이터를 한곳에서 검색·비교·분석하고, AI가 인사이트를 제공합니다.

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 아래 키들을 설정합니다:

| 변수 | 설명 | 필수 |
|------|------|:---:|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | Phase 1+ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 | Phase 1+ |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키 | Phase 2+ |
| `ANTHROPIC_API_KEY` | Claude API 키 (Vercel 환경변수) | Phase 3+ |

> ⚠️ **카카오맵 필수 설정**: 카카오 개발자 콘솔 → 내 애플리케이션 → 제품설정 → 카카오맵 → **활성화 설정 ON** (빠뜨리면 403 에러)

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 4. 빌드

```bash
npm run build
```

---

## 📂 프로젝트 구조

```
sejong-school-eum-talk/
├── public/illustrations/     # SVG 일러스트
├── src/
│   ├── components/
│   │   ├── common/           # Header, Footer
│   │   ├── chat/             # ChatPanel, ChatMessage, QuickChip
│   │   ├── map/              # KakaoMap, SchoolMarker, FilterPanel
│   │   ├── school/           # SchoolDetail, CompareCard
│   │   ├── stats/            # BarChart, LineChart, PieChart
│   │   └── data/             # UploadZone, DataSelector, DataViewer
│   ├── pages/                # 라우트별 페이지
│   ├── hooks/                # React 커스텀 훅
│   ├── lib/                  # 유틸리티 (supabase, claude, kakaoMap)
│   └── data/                 # 로컬 JSON 데이터 (fallback)
├── api/                      # Vercel Edge Functions
├── supabase/migrations/      # DB 마이그레이션 SQL
└── vercel.json               # Vercel 배포 설정
```

---

## 🛠 기술 스택

- **React 18** + **Vite** — UI 프레임워크 + 빌드
- **Tailwind CSS** — 반응형 유틸리티 CSS
- **Recharts** — 통계 차트
- **Kakao Map JS API** — 학교 위치 지도
- **Supabase** — DB (PostgreSQL) + Auth + Storage
- **Claude API** (claude-sonnet-4-20250514) — AI 채팅·분석
- **Vercel** — 배포 + Edge Functions

---

## 📋 개발 로드맵

| Phase | 내용 | 상태 |
|-------|------|:----:|
| **Phase 0** | 환경 세팅, 프로젝트 구조, 173개교 데이터 추출 | ✅ 완료 |
| **Phase 1** | Supabase 테이블, RLS, 데이터 적재, Auth | ⬜ 예정 |
| **Phase 2** | 랜딩, 카카오맵, 학교비교, 로그인 UI | ⬜ 예정 |
| **Phase 3** | Claude API 연동, AI 채팅, 인사이트 | ⬜ 예정 |
| **Phase 4** | 데이터 업로드, 모아보기, AI 분석 | ⬜ 예정 |
| **Phase 5** | 통계 고도화, 반응형, 성능 최적화, 배포 | ⬜ 예정 |

---

## 🔐 인증 구조

- `@korea.kr` 이메일 → `staff` 역할 (내부 기능 접근)
- 기타 이메일 → `public` 역할 (공개 기능만)
- 개발 모드: Supabase 미설정 시 로컬 로그인으로 대체

---

## 📊 데이터

- **173개교** 기본 정보 (2026.03.01 기준)
  - 유치원 64, 초등학교 55, 중학교 28, 고등학교 22, 특수학교 2, 각종학교 2
- `src/data/schools.json` — 공개 데이터 (학교명, 학교급, 학생수, 학급수, 지역 등)
- `src/data/schoolContacts.json` — 연락처 데이터 (교장, 교감, 행정실장)

---

## 🏫 세종특별자치시교육청 AI 학습동아리

© 2026 SejongSchoolEumTalk
