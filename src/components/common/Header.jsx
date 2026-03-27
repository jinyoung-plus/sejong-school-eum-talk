import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Search,
  Menu,
  X,
  LogIn,
  LogOut,
  User,
  Map,
  BarChart3,
  GitCompareArrows,
  MessageCircle,
  Database,
  Home,
  School,
  Settings,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '홈', icon: Home },
  { path: '/schools', label: '현황', icon: School },
  { path: '/map', label: '지도', icon: Map },
  { path: '/compare', label: '비교', icon: GitCompareArrows },
  { path: '/statistics', label: '통계', icon: BarChart3 },
  { path: '/chat', label: 'AI 채팅', icon: MessageCircle },
  { path: '/data', label: '데이터', icon: Database, staffOnly: true },
];

export default function Header() {
  const { user, isStaff, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  }

  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '사용자';

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-navy-700 via-navy-600 to-navy-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/illustrations/logo_128.png" alt="이음" className="w-9 h-9 rounded-full" />
            <div>
              <h1 className="text-white font-bold text-base tracking-tight leading-tight">
                세종 스쿨이음톡
              </h1>
              <p className="text-navy-300 text-[10px] font-normal">
                SejongSchoolEumTalk
              </p>
            </div>
          </Link>

          {/* 데스크톱 네비게이션 */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.staffOnly && !isStaff) return null;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `nav-link flex items-center gap-1.5 ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon size={15} />
                  <span>{item.label}</span>
                  {item.staffOnly && (
                    <span className="text-[9px] bg-primary-500/30 text-primary-300 px-1.5 py-0.5 rounded-full">
                      내부
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* 검색 + 사용자 정보 */}
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="학교명 또는 질문 입력..."
                  autoFocus
                  className="w-48 md:w-64 bg-white/15 border border-white/20 text-white
                             rounded-full px-4 py-1.5 pl-9 text-sm
                             placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-primary-400"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <button type="button" onClick={() => setSearchOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="p-2 text-white/60 hover:text-white transition-colors">
                <Search size={18} />
              </button>
            )}

            {/* 로그인 상태 */}
            {user ? (
              <div className="hidden sm:flex items-center gap-3 ml-2">
                {/* 사용자명 클릭 → 프로필 페이지 */}
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 text-white hover:text-primary-300 transition-colors group"
                  title="개인정보 관리"
                >
                  <div className="w-7 h-7 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition">
                    <User size={13} className="text-primary-300" />
                  </div>
                  <span className="text-sm font-medium">
                    {userName}
                    <span className="text-white/50 font-normal ml-0.5">님</span>
                  </span>
                </Link>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs
                             text-white/70 hover:text-white border border-white/20
                             rounded-full hover:bg-white/10 transition-all"
                >
                  <LogOut size={13} />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs
                           text-white bg-primary-500 rounded-full
                           hover:bg-primary-600 transition-all shadow-sm"
              >
                <LogIn size={13} />
                <span>로그인</span>
              </Link>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-white/70 hover:text-white">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-navy-700/95 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.staffOnly && !isStaff) return null;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                     ${isActive ? 'bg-primary-500/20 text-primary-300' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
                  }
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <div className="mt-2 pt-2 border-t border-white/10">
              {user ? (
                <div className="flex flex-col gap-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-primary-300 hover:bg-white/10 rounded-lg transition"
                  >
                    <User size={16} />
                    <span className="text-sm font-medium">{userName}님</span>
                    <Settings size={13} className="ml-auto text-white/30" />
                  </Link>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white w-full"
                  >
                    <LogOut size={16} />
                    <span>로그아웃</span>
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-primary-300">
                  <LogIn size={16} />
                  <span>로그인</span>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
