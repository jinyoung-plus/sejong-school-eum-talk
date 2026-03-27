import { useState, useMemo, useCallback } from 'react';
import { useSchools } from '../hooks/useSchools';
import { getStatisticsInsight } from '../lib/claude';
import { BarChart3, PieChart as PieIcon, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import MarkdownRenderer from '../components/common/MarkdownRenderer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const TABS = ['전체현황', '생활권별', '학교급별'];
const TYPE_COLORS = {
  유치원: '#f06292',
  초등학교: '#4285f4',
  중학교: '#34a853',
  고등학교: '#fbbc05',
  특수학교: '#ab47bc',
  각종학교: '#78909c',
};

// rawType → 표시용 학교급 매핑
function getDisplayType(rawType) {
  if (rawType === '병설유' || rawType === '단설유') return '유치원';
  if (rawType === '초') return '초등학교';
  if (rawType === '중') return '중학교';
  if (rawType === '공립고' || rawType === '사립고') return '고등학교';
  if (rawType === '특수학교') return '특수학교';
  if (rawType === '각종학교') return '각종학교';
  return '기타';
}

export default function Statistics() {
  const [activeTab, setActiveTab] = useState('전체현황');
  const { schools, loading } = useSchools();
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // 학교급별 집계
  const byTypeData = useMemo(() => {
    const map = {};
    schools.forEach(s => {
      const dt = getDisplayType(s.rawType);
      if (!map[dt]) map[dt] = { name: dt, 학교수: 0, 학생수: 0 };
      map[dt].학교수++;
      map[dt].학생수 += s.student_count || 0;
    });
    const order = ['유치원', '초등학교', '중학교', '고등학교', '특수학교', '각종학교'];
    return order.filter(t => map[t]).map(t => map[t]);
  }, [schools]);

  // 생활권별 집계
  const byRegionData = useMemo(() => {
    return ['동지역', '읍면지역'].map(region => {
      const regionSchools = schools.filter(s => s.region === region);
      return {
        name: region,
        학교수: regionSchools.length,
        학생수: regionSchools.reduce((sum, s) => sum + (s.student_count || 0), 0),
      };
    });
  }, [schools]);

  // 파이차트 데이터
  const pieData = useMemo(() => {
    return byTypeData.filter(d => d.학교수 > 0).map(d => ({ name: d.name, value: d.학교수 }));
  }, [byTypeData]);

  // AI 인사이트 호출
  const runAiInsight = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiResult('');
    try {
      const statsData = {
        총학교수: schools.length,
        총학생수: schools.reduce((sum, s) => sum + (s.student_count || 0), 0),
        학교급별: byTypeData.map(d => ({ 학교급: d.name, 학교수: d.학교수, 학생수: d.학생수 })),
        생활권별: byRegionData,
      };
      const result = await getStatisticsInsight(statsData);
      setAiResult(result);
    } catch (err) {
      setAiError(err.message || 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  }, [schools, byTypeData, byRegionData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="section-title flex items-center justify-center gap-2">
          <BarChart3 size={24} className="text-primary-500" />
          통계 분석
        </h2>
        <p className="section-subtitle">세종시 {schools.length}개교 교육 데이터를 한눈에</p>
      </div>

      <div className="flex justify-center gap-1 mb-8 bg-navy-50 rounded-xl p-1 max-w-md mx-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
              ${activeTab === tab
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-navy-400 hover:text-navy-600'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === '전체현황' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-primary-500" />
              학교급별 학교수
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTypeData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="학교수" radius={[6, 6, 0, 0]}>
                  {byTypeData.map(entry => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#ccc'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4 flex items-center gap-2">
              <PieIcon size={16} className="text-primary-500" />
              학교급별 비율
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#ccc'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6 md:col-span-2">
            <h4 className="font-bold text-navy-700 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-500" />
              학교급별 학생수
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTypeData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v.toLocaleString()}명`} />
                <Bar dataKey="학생수" radius={[6, 6, 0, 0]}>
                  {byTypeData.map(entry => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#ccc'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === '생활권별' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4">동지역 vs 읍면지역 학교수</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byRegionData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="학교수" radius={[6, 6, 0, 0]}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card p-6">
            <h4 className="font-bold text-navy-700 mb-4">동지역 vs 읍면지역 학생수</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byRegionData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v.toLocaleString()}명`} />
                <Bar dataKey="학생수" radius={[6, 6, 0, 0]}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === '학교급별' && (
        <div className="space-y-4">
          {byTypeData.map(item => {
            const avgStudents = item.학교수 > 0 ? Math.round(item.학생수 / item.학교수) : 0;
            return (
              <div key={item.name} className="card p-5 flex items-center gap-5">
                <div className="w-3 h-12 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[item.name] }} />
                <div className="flex-1">
                  <h4 className="font-bold text-navy-700">{item.name}</h4>
                  <p className="text-xs text-navy-400">{item.학교수}교</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-navy-700">{item.학생수.toLocaleString()}명</p>
                  <p className="text-xs text-navy-400">교당 평균 {avgStudents}명</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 card p-6 border border-primary-200 bg-gradient-to-r from-primary-50/50 to-blue-50/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-navy-700 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" />
            AI 인사이트
          </h4>
          <button onClick={runAiInsight} disabled={aiLoading}
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
            {schools.length}개교 통계 데이터를 기반으로 핵심 발견사항과 정책 제안을 AI가 생성합니다. "AI 분석 시작" 버튼을 눌러주세요.
          </p>
        )}
      </div>
    </div>
  );
}
