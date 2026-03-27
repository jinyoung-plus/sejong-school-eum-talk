import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  School,
  Users,
  MapPin,
  BookOpen,
  TrendingUp,
  BarChart3,
  ArrowLeftRight,
  GitCompareArrows,
  Lock,
  Briefcase,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Map,
} from 'lucide-react';



const quickChips = [
  '세종시에 초등학교가 몇 개인가요?',
  '학생수가 가장 많은 학교는?',
  '2025년 신설 학교 알려줘',
  '동지역과 읍면지역 학교 수 비교',
];

const topicCards = [
  {
    title: '학교 현황',
    desc: '173개교 기본정보·연락처 한눈에',
    icon: School,
    color: 'from-blue-500 to-blue-600',
    link: '/schools',
  },
  {
    title: '학교 비교',
    desc: '최대 3교 선택하여 나란히 비교',
    icon: GitCompareArrows,
    color: 'from-violet-500 to-violet-600',
    link: '/compare',
  },
  {
    title: '통계 분석',
    desc: '학교급별·생활권별 데이터 분석',
    icon: BarChart3,
    color: 'from-emerald-500 to-emerald-600',
    link: '/statistics',
  },
  {
    title: '업무지원',
    desc: '데이터 업로드·AI 분석 리포트',
    icon: Briefcase,
    color: 'from-slate-500 to-slate-600',
    link: '/data',
    locked: true,
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { stats, loading } = useSchools();
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function handleChip(text) {
    navigate(`/chat?q=${encodeURIComponent(text)}`);
  }

  // rawType별 stats → 학교급별 표시용 집계
  const bt = stats.byType || {};
  const typeDisplay = {
    유치원: (bt['병설유']?.count || 0) + (bt['단설유']?.count || 0),
    초등학교: bt['초']?.count || 0,
    중학교: bt['중']?.count || 0,
    고등학교: (bt['공립고']?.count || 0) + (bt['사립고']?.count || 0),
    특수학교: bt['특수학교']?.count || 0,
    각종학교: bt['각종학교']?.count || 0,
  };

  const kpis = [
    { label: '전체 학교', value: stats.total, suffix: '교', icon: School, color: 'text-primary-500' },
    { label: '총 학생수', value: stats.totalStudents?.toLocaleString(), suffix: '명', icon: Users, color: 'text-blue-500' },
    { label: '생활권', value: '24', suffix: '개 읍면동', icon: MapPin, color: 'text-amber-500' },
    { label: '학급당 학생수', value: stats.totalClasses ? (stats.totalStudents / stats.totalClasses).toFixed(1) : '-', suffix: '명', icon: BookOpen, color: 'text-emerald-500' },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* ─── 히어로 ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-700 via-navy-600 to-primary-700 py-16 md:py-24">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/5 rounded-full blur-3xl" />
          {/* 도트 패턴 */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* 배지 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/80 text-xs font-medium mb-6 animate-fade-in">
            <Sparkles size={12} className="text-primary-300" />
            세종시교육청 AI 학습동아리
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 animate-slide-up">
            세종시 학교 정보,
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-300 to-emerald-300 bg-clip-text text-transparent">
              AI에게 물어보세요
            </span>
          </h2>

          <p className="text-navy-300 text-sm md:text-base max-w-lg mx-auto mb-8 animate-slide-up delay-100 opacity-0">
            173개 학교의 모든 정보를 한곳에서 검색하고,
            <br className="hidden sm:block" />
            AI가 분석해서 알려드립니다.
          </p>

          {/* 검색창 */}
          <form
            onSubmit={handleSearch}
            className="relative max-w-xl mx-auto mb-5 animate-slide-up delay-200 opacity-0"
          >
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="학교명, 지역 또는 궁금한 점을 입력하세요..."
                className="w-full py-3.5 pl-11 pr-24 bg-white/95 backdrop-blur-sm
                           rounded-2xl text-navy-700 text-sm
                           placeholder-navy-300 shadow-card-lg
                           focus:outline-none focus:ring-2 focus:ring-primary-400
                           transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2
                           px-4 py-2 bg-primary-500 text-white text-sm font-semibold
                           rounded-xl hover:bg-primary-600 transition-colors shadow-sm"
              >
                <span className="hidden sm:inline">AI에게 질문</span>
                <Search size={16} className="sm:hidden" />
              </button>
            </div>
          </form>

          {/* 퀵 칩 */}
          <div className="flex flex-wrap justify-center gap-2 animate-slide-up delay-300 opacity-0">
            {quickChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChip(chip)}
                className="px-3 py-1.5 text-xs text-white/70 bg-white/10
                           border border-white/10 rounded-full
                           hover:bg-white/20 hover:text-white transition-all"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── KPI 카드 ─── */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className="card px-4 py-5 text-center animate-slide-up opacity-0"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <kpi.icon size={22} className={`mx-auto mb-2 ${kpi.color}`} />
              <p className="text-2xl md:text-3xl font-extrabold text-navy-700 tracking-tight">
                {loading ? '—' : kpi.value}
                <span className="text-sm font-medium text-navy-400 ml-1">
                  {kpi.suffix}
                </span>
              </p>
              <p className="text-xs text-navy-400 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 주제별 탐색 카드 ─── */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <h3 className="section-title text-center mb-2">주제별 탐색</h3>
        <p className="section-subtitle text-center mb-8">
          관심 있는 주제를 선택해 바로 탐색하세요
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {topicCards.map((card, i) => (
            <Link
              key={card.title}
              to={card.locked && !isStaff ? '/login' : card.link}
              className="group relative card p-5 md:p-6 hover:-translate-y-1 transition-all duration-300 animate-slide-up opacity-0"
              style={{ animationDelay: `${(i + 1) * 80}ms` }}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}
              >
                <card.icon size={18} className="text-white" />
              </div>
              <h4 className="font-bold text-navy-700 mb-1">{card.title}</h4>
              <p className="text-xs text-navy-400">{card.desc}</p>
              <ArrowRight
                size={14}
                className="absolute top-5 right-5 text-navy-200 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
              />

              {/* 내부전용 잠금 */}
              {card.locked && !isStaff && (
                <div className="locked-overlay">
                  <Lock size={20} />
                  <span className="text-xs font-medium">내부 직원 전용</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ─── AI 채팅 미리보기 ─── */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* 왼쪽: AI 채팅 데모 */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-navy-700 to-navy-600">
              <div className="flex items-center gap-2 mb-6">
                <MessageCircle size={18} className="text-primary-400" />
                <span className="text-white font-semibold text-sm">
                  AI 채팅 미리보기
                </span>
              </div>

              <div className="space-y-3">
                {/* 사용자 메시지 */}
                <div className="flex justify-end">
                  <div className="bg-primary-500 text-white text-sm px-4 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                    세종시에서 학생수가 가장 많은 초등학교는?
                  </div>
                </div>
                {/* AI 응답 */}
                <div className="flex justify-start">
                  <div className="bg-white/10 text-white/90 text-sm px-4 py-3 rounded-2xl rounded-tl-sm max-w-[85%] border border-white/5">
                    세종시에서 학생수가 가장 많은 초등학교는{' '}
                    <strong className="text-primary-300">새롬초등학교</strong>로,
                    현재 <strong className="text-primary-300">1,296명</strong>의
                    학생이 재학 중입니다. 63학급(특수 2학급 포함)으로 운영되고 있으며,
                    2017년 3월에 개교했습니다.
                  </div>
                </div>
              </div>

              <Link
                to="/chat"
                className="inline-flex items-center gap-2 mt-6 text-sm text-primary-300 hover:text-primary-200 font-medium transition-colors"
              >
                AI에게 직접 질문하기
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* 오른쪽: 지도 미리보기 */}
            <div className="p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-primary-500" />
                <span className="font-semibold text-sm text-navy-700">
                  지도에서 학교 찾기
                </span>
              </div>
              <p className="text-sm text-navy-400 mb-4">
                173개 학교의 위치를 카카오맵에서 한눈에 확인하세요.
                학교급별 필터, 마커 클릭으로 상세정보까지.
              </p>

              {/* 학교급별 미니 통계 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: '유치원', count: typeDisplay.유치원, color: '#f06292' },
                  { label: '초등학교', count: typeDisplay.초등학교, color: '#4285f4' },
                  { label: '중학교', count: typeDisplay.중학교, color: '#34a853' },
                  { label: '고등학교', count: typeDisplay.고등학교, color: '#fbbc05' },
                  { label: '특수학교', count: typeDisplay.특수학교, color: '#ab47bc' },
                  { label: '각종학교', count: typeDisplay.각종학교, color: '#78909c' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2 py-1.5 px-2.5 bg-surface-bg rounded-lg">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-navy-600 font-medium">{label}</span>
                    <span className="text-xs text-navy-400 ml-auto">{count}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/map"
                className="btn-primary self-start text-sm"
              >
                <Map size={14} />
                지도 탐색하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
