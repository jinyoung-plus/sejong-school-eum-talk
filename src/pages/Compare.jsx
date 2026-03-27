import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSchools } from '../hooks/useSchools';
import { analyzeSchools } from '../lib/claude';
import { GitCompareArrows, Search, X, Plus, School, Users, BookOpen, Calendar, MapPin, Filter, Sparkles, RefreshCw } from 'lucide-react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const COMPARE_COLORS = ['#0a8a7a', '#4285f4', '#f7a600'];
const SCHOOL_TYPE_FILTERS = ['전체', '유치원', '초등학교', '중학교', '고등학교', '특수학교'];

function getDisplayType(rawType) {
  if (rawType === '병설유' || rawType === '단설유') return '유치원';
  if (rawType === '초') return '초등학교';
  if (rawType === '중') return '중학교';
  if (rawType === '공립고' || rawType === '사립고') return '고등학교';
  if (rawType === '특수학교' || rawType === '각종학교') return '특수학교';
  return '기타';
}

export default function Compare() {
  const { schools } = useSchools();
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState('전체');
  const dropdownRef = useRef(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 검색 + 필터 결과
  const filteredSchools = useMemo(() => {
    let data = schools;

    if (typeFilter !== '전체') {
      data = data.filter(s => getDisplayType(s.rawType) === typeFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.area && s.area.toLowerCase().includes(q))
      );
    }

    return data;
  }, [schools, query, typeFilter]);

  function handleInputFocus() {
    setShowDropdown(true);
  }

  function handleInputChange(value) {
    setQuery(value);
    setShowDropdown(true);
  }

  function addSchool(school) {
    if (selected.length < 3 && !selected.find(s => s.id === school.id)) {
      setSelected([...selected, school]);
    }
    setQuery('');
    setShowDropdown(false);
  }

  function removeSchool(id) {
    setSelected(selected.filter(s => s.id !== id));
    setAiResult('');
    setAiError(null);
  }

  // AI 비교 분석 호출
  const runAiAnalysis = useCallback(async () => {
    if (selected.length < 2) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult('');
    try {
      const result = await analyzeSchools(selected);
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  }, [selected]);

  // 비교 차트 데이터
  const barData = useMemo(() => {
    if (selected.length < 2) return [];
    return [
      { name: '학생수', ...Object.fromEntries(selected.map((s, i) => [`school${i}`, s.student_count])) },
      { name: '학급수', ...Object.fromEntries(selected.map((s, i) => [`school${i}`, s.classes_count])) },
      { name: '특수학급', ...Object.fromEntries(selected.map((s, i) => [`school${i}`, s.special_classes || 0])) },
    ];
  }, [selected]);

  const radarData = useMemo(() => {
    if (selected.length < 2) return [];
    const maxStudents = Math.max(...selected.map(s => s.student_count || 1));
    const maxClasses = Math.max(...selected.map(s => s.classes_count || 1));
    return [
      { subject: '학생수', ...Object.fromEntries(selected.map((s, i) => [`s${i}`, Math.round((s.student_count / maxStudents) * 100)])) },
      { subject: '학급수', ...Object.fromEntries(selected.map((s, i) => [`s${i}`, Math.round((s.classes_count / maxClasses) * 100)])) },
      { subject: '학급당학생', ...Object.fromEntries(selected.map((s, i) => [`s${i}`, s.classes_count ? Math.round((s.student_count / s.classes_count) / 30 * 100) : 0])) },
    ];
  }, [selected]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="section-title flex items-center justify-center gap-2">
          <GitCompareArrows size={24} className="text-primary-500" />
          학교 비교
        </h2>
        <p className="section-subtitle">최대 3개 학교를 선택하여 나란히 비교하세요</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="max-w-lg mx-auto mb-8" ref={dropdownRef}>
        {/* 학교급 필터 칩 */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {SCHOOL_TYPE_FILTERS.map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setShowDropdown(true); }}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all
                ${typeFilter === t
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* 검색 입력 */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={selected.length >= 3 ? '최대 3교까지 선택 가능' : '학교명 또는 지역으로 검색...'}
            className="input-field pl-10"
            disabled={selected.length >= 3}
          />
          {query && (
            <button onClick={() => { setQuery(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* 드롭다운 리스트 */}
        {showDropdown && selected.length < 3 && (
          <div className="absolute z-20 w-full max-w-lg mt-1 bg-white rounded-xl shadow-card-lg border border-gray-200 max-h-96 overflow-y-auto">
            {filteredSchools.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                검색 결과가 없습니다
              </div>
            ) : (
              <>
                <div className="px-4 py-2 text-[11px] text-gray-400 border-b border-gray-100 sticky top-0 bg-white">
                  {typeFilter !== '전체' ? `${typeFilter} · ` : ''}{filteredSchools.length}교
                </div>
                {filteredSchools.map(s => {
                  const isSelected = selected.find(sel => sel.id === s.id);
                  return (
                    <button key={s.id} onClick={() => !isSelected && addSchool(s)}
                      disabled={!!isSelected}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left
                        ${isSelected ? 'opacity-40 cursor-default bg-gray-50' : 'hover:bg-blue-50'}`}>
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: isSelected ? '#999' : '#0a8a7a' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {getDisplayType(s.rawType)} · {(s.student_count || 0).toLocaleString()}명 · {s.classes_count || 0}학급 · {s.region}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] text-primary-500 font-semibold shrink-0">선택됨</span>
                      ) : (
                        <Plus size={14} className="text-gray-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* 선택 태그 */}
      {selected.length > 0 && (
        <div className="flex justify-center items-center gap-2 mb-6 flex-wrap">
          {selected.map((s, i) => (
            <div key={s.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: COMPARE_COLORS[i] }}>
              {s.name}
              <button onClick={() => removeSchool(s.id)} className="hover:bg-white/20 rounded-full p-0.5">
                <X size={13} />
              </button>
            </div>
          ))}
          <button onClick={() => { setSelected([]); setAiResult(''); setAiError(null); }}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
            전체 초기화
          </button>
        </div>
      )}

      {/* 비교 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map(idx => {
          const school = selected[idx];
          if (!school) {
            return (
              <div key={idx}
                className="card border-2 border-dashed border-navy-200 p-8 flex flex-col items-center justify-center text-navy-300 min-h-[280px] cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-all"
                onClick={() => document.querySelector('input[type=text]')?.focus()}>
                <Plus size={28} className="mb-2" />
                <p className="text-sm font-medium">학교 {idx + 1} 선택</p>
                <p className="text-[11px] text-navy-300 mt-1">위에서 검색하세요</p>
              </div>
            );
          }
          return (
            <div key={school.id} className="card overflow-hidden relative">
              <div className="h-2" style={{ backgroundColor: COMPARE_COLORS[idx] }} />
              <div className="p-5">
                <button onClick={() => removeSchool(school.id)}
                  className="absolute top-4 right-4 p-1 text-navy-300 hover:text-red-500 transition-colors">
                  <X size={15} />
                </button>

                <h4 className="font-extrabold text-navy-700 text-lg mb-1 pr-6">{school.name}</h4>
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full mb-4 inline-block">
                  {getDisplayType(school.rawType)}
                </span>

                <div className="space-y-2.5 mt-4">
                  <InfoRow icon={Users} label="학생수" value={`${(school.student_count || 0).toLocaleString()}명`} color={COMPARE_COLORS[idx]} />
                  <InfoRow icon={BookOpen} label="학급수" value={`${school.classes_count}학급`} />
                  <InfoRow icon={BookOpen} label="학급당학생" value={`${school.classes_count ? (school.student_count / school.classes_count).toFixed(1) : '—'}명`} />
                  <InfoRow icon={Calendar} label="개교일" value={school.established_date || '—'} />
                  <InfoRow icon={MapPin} label="지역" value={school.region} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 비교 차트 */}
      {selected.length >= 2 && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4 text-sm">수치 비교</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {selected.map((s, i) => (
                  <Bar key={s.id} dataKey={`school${i}`} name={s.name} fill={COMPARE_COLORS[i]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4 text-sm">상대 비교 (최대 = 100)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#eef1f5" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                {selected.map((s, i) => (
                  <Radar key={s.id} name={s.name} dataKey={`s${i}`} stroke={COMPARE_COLORS[i]} fill={COMPARE_COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selected.length >= 2 && (
        <div className="card p-6 border border-primary-200 bg-gradient-to-r from-primary-50/50 to-emerald-50/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-navy-700 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              AI 비교 분석
            </h4>
            <button onClick={runAiAnalysis} disabled={aiLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${aiLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'}`}>
              {aiLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 분석 중...</>
              ) : (
                <><RefreshCw size={14} /> {aiResult ? '다시 분석' : 'AI 분석 시작'}</>
              )}
            </button>
          </div>

          {aiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
              {aiError}
            </div>
          )}

          {aiResult ? (
            <MarkdownRenderer text={aiResult} />
          ) : !aiLoading && (
            <p className="text-sm text-navy-400">
              선택한 {selected.length}개 학교의 차이점과 특징을 AI가 분석합니다. "AI 분석 시작" 버튼을 눌러주세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 py-1 border-b border-navy-50 last:border-0">
      <Icon size={13} className="text-navy-300 shrink-0" />
      <span className="text-xs text-navy-400 w-16 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-navy-700 ml-auto" style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  );
}
