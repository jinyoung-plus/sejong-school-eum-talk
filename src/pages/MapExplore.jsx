import { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSchools } from '../hooks/useSchools';
import KakaoMap, { MARKER_COLORS } from '../components/map/KakaoMap';
import { Filter, Search, X, ChevronDown, ChevronUp, School, Users, ExternalLink } from 'lucide-react';

const SCHOOL_TYPES = ['전체', '유치원', '초등학교', '중학교', '고등학교', '특수학교'];
const REGIONS = ['전체', '동지역', '읍면지역'];

// schools.json의 type 값과 필터 매칭
function matchType(schoolType, filter) {
  if (filter === '전체') return true;
  if (filter === '유치원') return schoolType === '유치원';
  if (filter === '초등학교') return schoolType === '초등학교';
  if (filter === '중학교') return schoolType === '중학교';
  if (filter === '고등학교') return schoolType === '고등학교';
  if (filter === '특수학교') return schoolType === '특수학교' || schoolType === '각종학교';
  return true;
}

export default function MapExplore() {
  const [typeFilter, setTypeFilter] = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [studentRange, setStudentRange] = useState([0, 1500]);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [focusSchool, setFocusSchool] = useState(null);

  const navigate = useNavigate();
  const { schools: allSchools } = useSchools();

  // 프론트엔드에서 필터링
  const schools = useMemo(() => {
    let data = allSchools;

    if (typeFilter !== '전체') {
      data = data.filter(s => matchType(s.type, typeFilter));
    }
    if (regionFilter !== '전체') {
      data = data.filter(s => s.region === regionFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s => s.name.toLowerCase().includes(q));
    }
    if (studentRange[0] > 0) {
      data = data.filter(s => (s.student_count || 0) >= studentRange[0]);
    }
    if (studentRange[1] < 1500) {
      data = data.filter(s => (s.student_count || 0) <= studentRange[1]);
    }

    return data;
  }, [allSchools, typeFilter, regionFilter, search, studentRange]);

  const handleListClick = useCallback((school) => {
    setSelectedSchool(school);
    setFocusSchool(school);
  }, []);

  const handleMapClick = useCallback((school) => {
    setSelectedSchool(school);
  }, []);

  // 인포윈도우 상세보기 → React Router 네비게이션
  const handleInfoAction = useCallback((action, schoolId) => {
    if (action === 'detail') {
      navigate(`/school/${schoolId}`);
    }
  }, [navigate]);

  return (
    <div className="relative h-[calc(100vh-64px)] flex">
      {/* 왼쪽 필터 패널 */}
      <div
        className={`absolute md:relative z-20 h-full bg-white shadow-card-lg transition-all duration-300 flex flex-col
          ${showFilter ? 'w-[75vw] max-w-80' : 'w-0 overflow-hidden'}`}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-navy-700 flex items-center gap-2 text-sm">
              <Filter size={15} className="text-primary-500" />
              필터 및 학교 목록
            </h3>
            <button onClick={() => setShowFilter(false)}
              className="md:hidden p-1 text-navy-400 hover:text-navy-600">
              <X size={18} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="학교명 검색..."
              className="input-field pl-9 text-sm py-2" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold text-navy-500 mb-2 uppercase tracking-wider">학교급</p>
            <div className="flex flex-wrap gap-1.5">
              {SCHOOL_TYPES.map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-all
                    ${typeFilter === t
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
                  {t !== '전체' && (
                    <span className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: MARKER_COLORS[t] }} />
                  )}
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[11px] font-semibold text-navy-500 mb-2 uppercase tracking-wider">지역</p>
            <div className="flex gap-1.5">
              {REGIONS.map((r) => (
                <button key={r} onClick={() => setRegionFilter(r)}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all text-center
                    ${regionFilter === r
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'bg-navy-50 text-navy-500 hover:bg-navy-100'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[11px] font-semibold text-navy-500 mb-2 uppercase tracking-wider">
              학생수 범위: {studentRange[0]}~{studentRange[1]}명
            </p>
            <div className="flex gap-2 items-center">
              <input type="range" min="0" max="1500" step="50"
                value={studentRange[0]}
                onChange={(e) => setStudentRange([Number(e.target.value), studentRange[1]])}
                className="flex-1 h-1.5 accent-primary-500" />
              <input type="range" min="0" max="1500" step="50"
                value={studentRange[1]}
                onChange={(e) => setStudentRange([studentRange[0], Number(e.target.value)])}
                className="flex-1 h-1.5 accent-primary-500" />
            </div>
          </div>

          <div className="border-t border-navy-100 pt-3">
            <button onClick={() => setListCollapsed(!listCollapsed)}
              className="w-full flex items-center justify-between text-xs text-navy-500 mb-3">
              <span className="font-semibold">
                검색 결과 <strong className="text-primary-600">{schools.length}</strong>교
              </span>
              {listCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {!listCollapsed && (
              <div className="space-y-1 max-h-[45vh] overflow-y-auto">
                {schools.map((school) => (
                  <button key={school.id} onClick={() => handleListClick(school)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-colors text-left
                      ${selectedSchool?.id === school.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-navy-50'}`}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: MARKER_COLORS[school.type] || '#999' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-700 truncate">{school.name}</p>
                      <p className="text-[10px] text-navy-400">
                        {school.student_count}명 · {school.classes_count}학급 · {school.region}
                      </p>
                    </div>
                    <Link to={`/school/${school.id}`} onClick={(e) => e.stopPropagation()}
                      className="text-navy-300 hover:text-primary-500 shrink-0">
                      <ExternalLink size={12} />
                    </Link>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-navy-100 bg-navy-50/50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
            {Object.entries(MARKER_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-navy-500">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 relative">
        {!showFilter && (
          <button onClick={() => setShowFilter(true)}
            className="absolute top-4 left-4 z-10 btn-secondary text-sm shadow-card bg-white">
            <Filter size={14} /> 필터
          </button>
        )}

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <div className="bg-white/90 backdrop-blur-sm shadow-card rounded-full px-4 py-1.5 flex items-center gap-2">
            <School size={13} className="text-primary-500" />
            <span className="text-xs font-semibold text-navy-700">{schools.length}교</span>
            <span className="text-navy-200">|</span>
            <Users size={13} className="text-blue-500" />
            <span className="text-xs font-semibold text-navy-700">
              {schools.reduce((a, s) => a + (s.student_count || 0), 0).toLocaleString()}명
            </span>
          </div>
        </div>

        <KakaoMap
          schools={schools}
          focusSchool={focusSchool}
          onSchoolClick={handleMapClick}
          onInfoAction={handleInfoAction}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
