// src/pages/SchoolStatus.jsx
// 세종시 학교현황 대시보드 — HTML 대시보드 스타일 재구현
// 비로그인: 구분, 학교명, 개원개교일, 대표전화, 학급수, 학생수, 홈페이지
// 로그인(staff): + 원장교장, 원감교감, 행정실장 (이름·전화)

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSchools } from '../hooks/useSchools';
import {
  Search, Star, Lock, ExternalLink, ChevronUp, ChevronDown,
  ChevronsUpDown, X, Copy, Check,
} from 'lucide-react';

const TYPE_COLOR = {
  '병설유': 'bg-pink-100 text-pink-700 border-pink-200',
  '단설유': 'bg-purple-100 text-purple-700 border-purple-200',
  '초':     'bg-blue-100 text-blue-700 border-blue-200',
  '중':     'bg-green-100 text-green-700 border-green-200',
  '공립고': 'bg-amber-100 text-amber-700 border-amber-200',
  '사립고': 'bg-orange-100 text-orange-700 border-orange-200',
  '특수학교':'bg-violet-100 text-violet-700 border-violet-200',
  '각종학교':'bg-slate-100 text-slate-700 border-slate-200',
};

const FILTER_TABS = [
  { key: '전체', label: '전체' },
  { key: '병설유', label: '병설유' },
  { key: '단설유', label: '단설유' },
  { key: '초', label: '초등학교' },
  { key: '중', label: '중학교' },
  { key: '공립고', label: '공립고' },
  { key: '사립고', label: '사립고' },
  { key: '특수·각종', label: '특수·각종' },
];

const TAB_COLORS = {
  '전체': '#0a8a7a',
  '병설유': '#f06292',
  '단설유': '#ab47bc',
  '초': '#4285f4',
  '중': '#34a853',
  '공립고': '#fbbc05',
  '사립고': '#f97316',
  '특수·각종': '#78909c',
};

function getTypeGroup(rawType) {
  if (rawType === '특수학교' || rawType === '각종학교') return '특수·각종';
  return rawType;
}

function formatClasses(count, special) {
  if (!count) return '-';
  if (special) return `${count}(${special})`;
  return String(count);
}

function highlight(text, query) {
  if (!query || !text) return text || '';
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{p}</mark>
      : p
  );
}

export default function SchoolStatus() {
  const { isStaff } = useAuth();
  const { schools } = useSchools();

  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState('전체');
  const [regionFilter, setRegionFilter] = useState('전체');
  const [sortKey, setSortKey]           = useState('default');
  const [favorites, setFavorites]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('edu_favorites') || '[]'); } catch { return []; }
  });
  const [showFavOnly, setShowFavOnly]   = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [copied, setCopied]             = useState('');

  const tabStats = useMemo(() => {
    const counts = { '전체': 0, '병설유': 0, '단설유': 0, '초': 0, '중': 0, '공립고': 0, '사립고': 0, '특수·각종': 0 };
    const students = { ...counts };
    schools.forEach(s => {
      const g = getTypeGroup(s.rawType);
      counts['전체']++;
      counts[g] = (counts[g] || 0) + 1;
      students['전체'] += (s.student_count || 0);
      students[g] = (students[g] || 0) + (s.student_count || 0);
    });
    return { counts, students };
  }, [schools]);

  const filtered = useMemo(() => {
    let data = schools.slice();
    if (typeFilter !== '전체') data = data.filter(s => getTypeGroup(s.rawType) === typeFilter);
    if (regionFilter !== '전체') data = data.filter(s => s.region === regionFilter);
    if (showFavOnly) data = data.filter(s => favorites.includes(s.name));
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.main_phone && s.main_phone.includes(q)) ||
        (s.principal_name && s.principal_name.toLowerCase().includes(q)) ||
        (s.vice_principal_name && s.vice_principal_name.toLowerCase().includes(q)) ||
        (s.admin_name && s.admin_name.toLowerCase().includes(q))
      );
    }
    if (sortKey === 'name')           data.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    else if (sortKey === 'stu_desc')  data.sort((a, b) => (b.student_count || 0) - (a.student_count || 0));
    else if (sortKey === 'stu_asc')   data.sort((a, b) => (a.student_count || 0) - (b.student_count || 0));
    else if (sortKey === 'cls_desc')  data.sort((a, b) => (b.classes_count || 0) - (a.classes_count || 0));
    else if (sortKey === 'date_asc')  data.sort((a, b) => (a.established_date || '9999').localeCompare(b.established_date || '9999'));
    else if (sortKey === 'date_desc') data.sort((a, b) => (b.established_date || '').localeCompare(a.established_date || ''));
    return data;
  }, [schools, typeFilter, regionFilter, showFavOnly, search, sortKey, favorites]);

  const toggleFav = useCallback((name, e) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      localStorage.setItem('edu_favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  const copyPhone = useCallback((phone, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(phone).catch(() => {});
    setCopied(phone);
    setTimeout(() => setCopied(''), 2000);
  }, []);

  const cycleSort = (ascKey, descKey) => {
    setSortKey(prev => {
      if (prev === descKey) return ascKey;
      if (prev === ascKey) return 'default';
      return descKey;
    });
  };
  const SortIcon = ({ ascKey, descKey }) => {
    if (sortKey === descKey) return <ChevronDown size={12} className="inline text-blue-400" />;
    if (sortKey === ascKey)  return <ChevronUp size={12} className="inline text-blue-400" />;
    return <ChevronsUpDown size={12} className="inline text-gray-400" />;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="bg-gradient-to-br from-navy-700 via-navy-600 to-primary-700 px-4 py-8">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-2xl font-extrabold text-white mb-1">세종시 학교 현황</h1>
          <p className="text-white/60 text-sm">2026년 3월 1일 기준 · {schools.length}개교</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
              className={`rounded-xl p-3 text-center transition-all border overflow-hidden relative ${
                typeFilter === tab.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
              style={{ borderTop: `3px solid ${TAB_COLORS[tab.key]}` }}>
              <div className="text-xs font-medium mb-1 truncate">{tab.label}</div>
              <div className="text-xl font-extrabold leading-none">{tabStats.counts[tab.key] ?? 0}</div>
              <div className="text-xs opacity-70 mt-1">{(tabStats.students[tab.key] || 0).toLocaleString()}명</div>
            </button>
          ))}
        </div>

        {/* 검색·필터 바 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="학교명, 담당자명, 전화번호 검색..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              )}
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {['전체', '동지역', '읍면지역'].map(r => (
                <button key={r} onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    regionFilter === r ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>{r}</button>
              ))}
            </div>
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className="text-sm font-semibold border-2 border-primary-300 rounded-lg px-3 py-2 bg-primary-50 text-primary-700 cursor-pointer focus:ring-2 focus:ring-primary-200">
              <option value="default">정렬: 기본순</option>
              <option value="name">이름순</option>
              <option value="stu_desc">학생수 많은순</option>
              <option value="stu_asc">학생수 적은순</option>
              <option value="cls_desc">학급수 많은순</option>
              <option value="date_asc">개교일 오래된순</option>
              <option value="date_desc">개교일 최신순</option>
            </select>
            <button onClick={() => setShowFavOnly(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                showFavOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300'
              }`}>
              <Star size={13} className={showFavOnly ? 'fill-amber-400 text-amber-400' : ''} />
              즐겨찾기 {favorites.length > 0 && `(${favorites.length})`}
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          검색 결과 <span className="font-bold text-gray-900">{filtered.length}</span>교
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0d2137] text-white">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">구분</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold cursor-pointer select-none"
                    onClick={() => cycleSort('name', 'name')}>
                    학교명 <SortIcon ascKey="name" descKey="name" />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                    onClick={() => cycleSort('date_asc', 'date_desc')}>
                    개원·개교일 <SortIcon ascKey="date_asc" descKey="date_desc" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">대표전화</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                    onClick={() => cycleSort('cls_asc', 'cls_desc')}>
                    학급수 <SortIcon ascKey="cls_asc" descKey="cls_desc" />
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                    onClick={() => cycleSort('stu_asc', 'stu_desc')}>
                    원아·학생수 <SortIcon ascKey="stu_asc" descKey="stu_desc" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold">홈페이지</th>
                  {isStaff && <>
                    <th className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap">원장·교장</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap">원감·교감</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold">행정실장</th>
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const isFav = favorites.includes(s.name);
                  const classes = formatClasses(s.classes_count, s.special_classes);
                  return (
                    <tr key={s.id} onClick={() => setSelectedSchool(s)}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isFav ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-2 py-2.5 text-center">
                        <button onClick={e => toggleFav(s.name, e)} className="group">
                          <Star size={14} className={isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-200 group-hover:text-amber-300'} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${TYPE_COLOR[s.rawType] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {s.rawType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            s.region === '동지역' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                          }`}>{s.region === '동지역' ? '동' : '읍면'}</span>
                          <span className="font-semibold text-gray-900 whitespace-nowrap">{highlight(s.name, search)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-500 text-xs whitespace-nowrap">{s.established_date || '-'}</td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        {s.main_phone ? (
                          <button onClick={e => copyPhone(s.main_phone, e)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-mono group">
                            {highlight(s.main_phone, search)}
                            {copied === s.main_phone ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-0 group-hover:opacity-50" />}
                          </button>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-600 font-mono text-xs">{classes}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-800">
                        {s.student_count ? Number(s.student_count).toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        {s.homepage ? (
                          <a href={s.homepage} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                            바로가기 <ExternalLink size={11} />
                          </a>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      {isStaff && <>
                        <td className="px-3 py-2.5">
                          <PersonCell name={s.principal_name} phone={s.principal_phone} query={search} onCopy={copyPhone} copied={copied} />
                        </td>
                        <td className="px-3 py-2.5">
                          <PersonCell name={s.vice_principal_name} phone={s.vice_principal_phone} query={search} onCopy={copyPhone} copied={copied} />
                        </td>
                        <td className="px-3 py-2.5">
                          <PersonCell name={s.admin_name} phone={s.admin_phone} query={search} onCopy={copyPhone} copied={copied} />
                        </td>
                      </>}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isStaff ? 11 : 8} className="text-center py-16 text-gray-400">
                      <div className="text-4xl mb-3">🏫</div>
                      <div className="font-medium text-gray-500 mb-1">검색 결과가 없습니다</div>
                      <div className="text-xs">검색어나 필터를 변경해 보세요</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isStaff && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <Lock size={14} className="shrink-0" />
            원장·교장, 원감·교감, 행정실장 연락처는 교육청 직원 로그인 후 열람 가능합니다.
          </div>
        )}
      </div>

      {selectedSchool && (
        <SchoolModal school={selectedSchool} isStaff={isStaff}
          onClose={() => setSelectedSchool(null)} onCopy={copyPhone} copied={copied} />
      )}
    </div>
  );
}

function PersonCell({ name, phone, query, onCopy, copied }) {
  if (!name) return <span className="text-gray-300 text-xs">-</span>;
  return (
    <div>
      <div className="text-sm font-medium text-gray-800">{highlight(name, query)}</div>
      {phone && (
        <button onClick={e => { e.stopPropagation(); onCopy(phone, e); }}
          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-mono mt-0.5 group">
          {highlight(phone, query)}
          {copied === phone ? <Check size={10} className="text-green-500" /> : <Copy size={10} className="opacity-0 group-hover:opacity-50" />}
        </button>
      )}
    </div>
  );
}

function SchoolModal({ school, isStaff, onClose, onCopy, copied }) {
  const s = school;
  const classes = formatClasses(s.classes_count, s.special_classes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-[#0d2137] to-[#152f4a] text-white px-6 py-5 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20">{s.rawType}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  s.region === '동지역' ? 'bg-blue-400/30' : 'bg-amber-400/30'
                }`}>{s.region}</span>
              </div>
              <h2 className="text-xl font-extrabold">{s.name}</h2>
              {s.established_date && <p className="text-white/60 text-xs mt-1">개교: {s.established_date}</p>}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white p-1"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs">총 학급 수</div>
              <div className="text-2xl font-extrabold mt-1">{classes}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-white/60 text-xs">원아·학생 수</div>
              <div className="text-2xl font-extrabold mt-1">
                {s.student_count ? Number(s.student_count).toLocaleString() : '-'}
                <span className="text-sm font-normal ml-1">명</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {s.main_phone && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">대표전화</div>
                <div className="font-mono font-semibold text-gray-900">{s.main_phone}</div>
              </div>
              <button onClick={e => onCopy(s.main_phone, e)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-50 rounded-lg">
                {copied === s.main_phone ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                복사
              </button>
            </div>
          )}
          {s.address && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 mb-0.5">주소</div>
              <div className="text-sm text-gray-900">{s.address}</div>
            </div>
          )}
          {s.homepage && (
            <a href={s.homepage} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-primary-50 border border-primary-100 rounded-xl hover:bg-primary-100 transition-colors">
              <div>
                <div className="text-xs text-primary-500 mb-0.5">홈페이지</div>
                <div className="text-sm text-primary-700 font-medium truncate max-w-[240px]">{s.homepage}</div>
              </div>
              <ExternalLink size={16} className="text-primary-500 shrink-0" />
            </a>
          )}
          {isStaff ? (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">담당자 연락처</div>
              <div className="space-y-2">
                {[
                  { role: '원장·교장', name: s.principal_name, phone: s.principal_phone },
                  { role: '원감·교감', name: s.vice_principal_name, phone: s.vice_principal_phone },
                  { role: '행정실장',  name: s.admin_name, phone: s.admin_phone },
                ].filter(c => c.name).map(c => (
                  <div key={c.role} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <div className="text-xs text-gray-400">{c.role}</div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      {c.phone && <div className="text-xs font-mono text-gray-500 mt-0.5">{c.phone}</div>}
                    </div>
                    {c.phone && (
                      <button onClick={e => onCopy(c.phone, e)}
                        className="text-xs text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg flex items-center gap-1">
                        {copied === c.phone ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        복사
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <Lock size={14} className="shrink-0" />
              담당자 연락처는 교육청 직원 로그인 후 열람 가능합니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
