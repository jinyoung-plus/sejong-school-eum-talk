/**
 * DataManage.jsx (v2 — 수정판)
 * - ErrorBoundary로 크래시 방지
 * - useAuth/useSchools 반환값 방어 처리
 * - 파일 업로드 에러 핸들링 강화
 */

import { useState, useCallback, useMemo, useRef, Component } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSchools } from '../hooks/useSchools';
import { useDatasets } from '../hooks/useDatasets';
import {
  DATA_CATEGORIES,
  SCOPE_OPTIONS,
  getScopeCount,
  downloadTemplate,
  validateUploadData,
} from '../lib/templateGenerator';
import {
  Upload, Download, FileSpreadsheet, Table2,
  CheckCircle2, AlertTriangle, Info, X, Search, Trash2, Pencil,
  Database, FolderOpen, Bot, RefreshCw,
} from 'lucide-react';

// 학교급별 색상
const TYPE_COLORS = {
  '유치원': '#ec4899', '초등학교': '#3b82f6', '중학교': '#22c55e',
  '고등학교': '#f59e0b', '특수학교': '#7c5cfc', '각종학교': '#94a3b8',
};

// ============================================================
// ErrorBoundary — 크래시 시 빈 화면 방지
// ============================================================
class DataManageErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[DataManage] 렌더링 에러:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="text-center max-w-lg bg-white rounded-2xl p-8 border border-red-200 shadow">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">데이터 관리 페이지 오류</h2>
            <p className="text-sm text-slate-500 mb-4">
              페이지 로드 중 오류가 발생했습니다.
            </p>
            <pre className="text-xs text-left bg-slate-50 rounded-lg p-4 mb-4 overflow-auto max-h-40 text-red-600">
              {this.state.error?.message || '알 수 없는 오류'}
            </pre>
            <div className="text-xs text-slate-400 mb-4 text-left space-y-1">
              <p>• <code>npm install xlsx</code> 실행 여부를 확인해주세요</p>
              <p>• 브라우저 개발자도구(F12) → Console 탭에서 상세 에러를 확인하세요</p>
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
            >
              다시 시도
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// 메인 export
// ============================================================
export default function DataManage() {
  return (
    <DataManageErrorBoundary>
      <DataManageInner />
    </DataManageErrorBoundary>
  );
}

// ============================================================
// 실제 데이터 관리 컴포넌트
// ============================================================
function DataManageInner() {
  // 훅 호출 — 반환값이 다를 수 있으므로 방어적 처리
  const authResult = useAuth() || {};
  const user = authResult.user || null;
  const role = authResult.role || 'public';

  const schoolsResult = useSchools() || {};
  const schools = schoolsResult.schools || [];

  const {
    datasets = [], parseFile, uploadDataset, updateDataset, deleteDataset, getDatasetRows,
  } = useDatasets(user) || {};

  const [activeTab, setActiveTab] = useState('upload');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 비로그인 또는 일반 사용자
  if (!user || role === 'public') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4 opacity-30">🔒</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">내부 직원 전용 기능</h2>
          <p className="text-sm text-slate-500">
            데이터 관리 기능은 교육청 직원(@korea.kr) 로그인 후 이용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* 페이지 헤더 */}
        <div className="mb-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Database size={18} />
            </span>
            데이터 관리
          </h1>
          <p className="text-xs text-slate-400 mt-1 ml-11">
            표준 템플릿으로 업로드하고, 학교코드 기준으로 모아보고, AI가 분석합니다.
          </p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit my-5">
          {[
            { id: 'upload', icon: Upload, label: '업로드' },
            { id: 'view', icon: Table2, label: '모아보기' },
            { id: 'history', icon: FolderOpen, label: '업로드 내역', count: datasets.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        {activeTab === 'upload' && (
          <UploadTab
            schools={schools}
            user={user}
            parseFile={parseFile}
            uploadDataset={uploadDataset}
            showToast={showToast}
          />
        )}
        {activeTab === 'view' && (
          <ViewTab
            schools={schools}
            datasets={datasets}
            getDatasetRows={getDatasetRows}
            showToast={showToast}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            datasets={datasets}
            updateDataset={updateDataset}
            deleteDataset={deleteDataset}
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}
      </div>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
        }`} style={{ animation: 'fadeInUp .4s ease' }}>
          {toast.type === 'success' && <CheckCircle2 size={16} className="text-teal-400" />}
          {toast.type === 'error' && <AlertTriangle size={16} className="text-amber-300" />}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ============================================================
// TAB 1: 업로드
// ============================================================
function UploadTab({ schools, user, parseFile, uploadDataset, showToast }) {
  const [category, setCategory] = useState('시설현황');
  const [scope, setScope] = useState('전체');
  const [parsedData, setParsedData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [metaDate, setMetaDate] = useState(new Date().toISOString().slice(0, 10));
  const [metaCategory, setMetaCategory] = useState('시설현황');
  const [metaScope, setMetaScope] = useState('전체');
  const [metaDesc, setMetaDesc] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // 파일 처리
  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setUploadError(null);

      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'csv', 'xls'].includes(ext)) {
        showToast('xlsx 또는 csv 파일만 지원합니다.', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('파일 크기가 10MB를 초과합니다.', 'error');
        return;
      }

      setIsParsing(true);
      try {
        const result = await parseFile(file);
        const parsed = { ...result, filename: file.name, fileSize: file.size };
        setParsedData(parsed);

        // 검증
        const validationResults = validateUploadData(result.headers, result.rows, schools);
        setValidation(validationResults);

        // 분류 자동 추정
        const catGuess = DATA_CATEGORIES.find((c) =>
          c.columns.some((col) => result.headers.some((h) => h.includes(col.replace(/\(.*\)/, ''))))
        );
        if (catGuess) setMetaCategory(catGuess.value);
      } catch (err) {
        console.error('[Upload] 파싱 에러:', err);
        setUploadError(err.message || '파일 파싱에 실패했습니다.');
        showToast('파일 파싱 실패', 'error');
      } finally {
        setIsParsing(false);
      }
    },
    [parseFile, schools, showToast]
  );

  // 드래그앤드롭
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  // 업로드 확정
  const handleConfirm = useCallback(async () => {
    if (!parsedData) return;
    try {
      const result = await uploadDataset({
        headers: parsedData.headers,
        rows: parsedData.rows,
        metadata: {
          category: metaCategory,
          scope: metaScope,
          referenceDate: metaDate,
          description: metaDesc,
          filename: parsedData.filename,
        },
      });
      if (result.success) {
        showToast(`"${parsedData.filename}" 업로드 완료!${result.isLocal ? ' (로컬 저장)' : ''}`);
        handleReset();
      }
    } catch (err) {
      console.error('[Upload] 저장 에러:', err);
      showToast('업로드 실패: ' + (err.message || ''), 'error');
    }
  }, [parsedData, metaCategory, metaScope, metaDate, metaDesc, uploadDataset, showToast]);

  const handleReset = useCallback(() => {
    setParsedData(null);
    setValidation(null);
    setUploadError(null);
    setMetaDesc('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* LEFT */}
      <div className="space-y-4">
        {/* Step 1: 템플릿 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Download size={15} className="text-teal-600" />
            Step 1. 표준 템플릿 다운로드
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">자료 분류</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs focus:border-teal-500 outline-none">
                  {DATA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">대상 학교 범위</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs focus:border-teal-500 outline-none">
                  {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} ({getScopeCount(schools, o.value)}교)</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => {
                try {
                  const count = downloadTemplate({ schools, categoryValue: category, scopeValue: scope });
                  if (count) showToast(`${category} 템플릿 다운로드 (${count}교)`);
                } catch (err) { showToast('템플릿 생성 실패', 'error'); }
              }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-teal-600 text-teal-700 text-xs font-semibold hover:bg-teal-50 transition">
                <Download size={14} /> CSV 다운로드
              </button>
              <span className="text-[11px] text-slate-400">A(학교코드) B(학교명) C(학교급) 고정 · D열부터 자유 입력</span>
            </div>
          </div>
        </div>

        {/* Step 2: 파일 업로드 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Upload size={15} className="text-teal-600" /> Step 2. 파일 업로드
          </div>
          <div className="p-5">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-teal-400 hover:bg-teal-50/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="text-3xl mb-2 opacity-30">📄</div>
              <div className="text-sm font-semibold text-slate-500">파일을 여기에 끌어다 놓으세요</div>
              <div className="text-[11px] text-slate-400 mt-1">Excel(.xlsx), CSV(.csv) 지원 · 최대 10MB</div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>

            {/* 파싱 중 */}
            {isParsing && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <RefreshCw size={16} className="text-amber-600 animate-spin" />
                <span className="text-xs text-amber-700 font-medium">파일을 분석하고 있습니다...</span>
              </div>
            )}

            {/* 에러 표시 */}
            {uploadError && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-red-700 mb-1">파싱 오류</div>
                    <pre className="text-[11px] text-red-600 whitespace-pre-wrap">{uploadError}</pre>
                  </div>
                  <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              </div>
            )}

            {/* 파싱 완료 */}
            {parsedData && !isParsing && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-extrabold text-white ${
                  parsedData.filename.endsWith('.csv') ? 'bg-blue-500' : 'bg-green-600'
                }`}>
                  {parsedData.filename.split('.').pop().toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{parsedData.filename}</div>
                  <div className="text-[11px] text-slate-400">{parsedData.rows.length}행 × {parsedData.headers.length}열</div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-teal-700">파싱 완료</span>
                <button onClick={handleReset} className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: 메타데이터 */}
        {parsedData && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-sm font-bold text-slate-700">
              <FileSpreadsheet size={15} className="text-teal-600" /> Step 3. 메타데이터 입력
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">대상 학교 범위</label>
                  <select value={metaScope} onChange={(e) => setMetaScope(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none">
                    {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">자료 기준일 *</label>
                  <input type="date" value={metaDate} onChange={(e) => setMetaDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">담당자명</label>
                  <input type="text" value={user?.email?.split('@')[0] || ''} readOnly
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs bg-slate-50 text-slate-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">자료 분류</label>
                  <select value={metaCategory} onChange={(e) => setMetaCategory(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none">
                    {DATA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">자료 설명 (선택)</label>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)}
                    placeholder="예: 고등학교 학년별 학생현황 자료입니다."
                    className="w-full h-16 rounded-lg border border-slate-200 px-3 py-2 text-xs resize-none outline-none" />
                </div>
              </div>

              {/* 단위 표기 안내 */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>항목명에 단위를 괄호로 표기해주세요.</strong><br />
                  예) 소규모공사비<strong>(천원)</strong>, 소화기<strong>(대)</strong>, 건물면적<strong>(㎡)</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50">
                  취소
                </button>
                <button onClick={handleConfirm}
                  className="px-5 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> 업로드 확정
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: 미리보기 */}
      <div>
        {parsedData ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <span className="text-sm font-bold text-slate-700">데이터 미리보기</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-400">
                  {parsedData.rows.length}행 × {parsedData.headers.length}열
                </span>
              </div>
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {parsedData.headers.map((h, i) => (
                        <th key={i} className="bg-slate-50 px-3 py-2.5 text-left font-bold text-slate-500 border-b border-slate-200 whitespace-nowrap sticky top-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 15).map((row, ri) => (
                      <tr key={ri} className="hover:bg-teal-50/50">
                        {row.map((cell, ci) => (
                          <td key={ci} className={`px-3 py-2 border-b border-slate-100 ${
                            ci <= 1 ? 'font-semibold text-slate-800 whitespace-nowrap' : 'text-slate-500'
                          } ${!isNaN(cell) && cell !== '' ? 'text-right font-mono' : ''}`}>
                            {cell || <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData.rows.length > 15 && (
                      <tr><td colSpan={parsedData.headers.length} className="text-center py-3 text-slate-400 text-[11px]">
                        ... {parsedData.rows.length - 15}행 더
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 검증 결과 */}
            {validation && (
              <div className={`rounded-2xl p-4 border ${
                validation.every((v) => v.type === 'ok') ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${
                  validation.every((v) => v.type === 'ok') ? 'text-teal-700' : 'text-amber-700'
                }`}>
                  {validation.every((v) => v.type === 'ok')
                    ? <><CheckCircle2 size={14} /> AI 자동 검증 통과</>
                    : <><AlertTriangle size={14} /> AI 자동 검증 결과</>
                  }
                </div>
                <div className="space-y-1">
                  {validation.map((v, i) => (
                    <div key={i} className="text-xs flex items-start gap-1.5">
                      {v.type === 'ok' && <CheckCircle2 size={13} className="text-green-600 mt-0.5 flex-shrink-0" />}
                      {v.type === 'warn' && <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />}
                      {v.type === 'info' && <Info size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                      <span className={v.type === 'ok' ? 'text-green-800' : v.type === 'warn' ? 'text-amber-800' : 'text-blue-700'}>
                        {v.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[420px]">
            <div className="text-center px-6">
              <div className="text-5xl mb-3 opacity-20">📁</div>
              <div className="text-sm font-semibold text-slate-500 mb-1">아직 파일이 없습니다</div>
              <div className="text-[11px] text-slate-400">좌측에서 템플릿을 다운로드하고 데이터를 채워서 업로드하세요.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB 2: 모아보기
// ============================================================
function ViewTab({ schools, datasets, getDatasetRows, showToast }) {
  const [showStudents, setShowStudents] = useState(true);
  const [showClasses, setShowClasses] = useState(true);
  const [showRegion, setShowRegion] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);

  const filteredSchools = useMemo(() => {
    return (schools || []).filter((s) => {
      if (filterType && s.type !== filterType) return false;
      if (filterRegion && s.region !== filterRegion) return false;
      if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [schools, filterType, filterRegion, searchText]);

  const stats = useMemo(() => {
    const totalStudents = filteredSchools.reduce((sum, s) => sum + (s.student_count || 0), 0);
    const totalClasses = filteredSchools.reduce((sum, s) => sum + (s.classes_count || 0), 0);
    return {
      count: filteredSchools.length, totalStudents, totalClasses,
      ratio: totalClasses ? (totalStudents / totalClasses).toFixed(1) : '—',
    };
  }, [filteredSchools]);

  const activeDatasets = useMemo(() =>
    (datasets || []).filter((d) => selectedDatasetIds.includes(d.id)),
    [datasets, selectedDatasetIds]
  );

  const toggleDataset = (id) => setSelectedDatasetIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const dbColCount = 2 + (showStudents ? 1 : 0) + (showClasses ? 1 : 0) + (showRegion ? 1 : 0);

  const handleDownloadCSV = () => {
    // 헤더 구성: DB 기본 컬럼 + 업로드 데이터 컬럼
    const dbHeaders = ['학교명', '학교급'];
    if (showStudents) dbHeaders.push('학생수');
    if (showClasses) dbHeaders.push('학급수');
    dbHeaders.push('학급당학생수');
    if (showRegion) dbHeaders.push('지역');

    // 업로드 데이터 헤더 (D열부터 = index 3~)
    const uploadHeaders = [];
    activeDatasets.forEach((ds) => {
      const { headers } = getDatasetRows ? getDatasetRows(ds) : { headers: [] };
      headers.slice(3).forEach((h) => uploadHeaders.push(h));
    });

    const allHeaders = [...dbHeaders, ...uploadHeaders];
    let csv = '\uFEFF' + allHeaders.join(',') + '\n';

    filteredSchools.forEach((s) => {
      const ratio = s.classes_count ? (s.student_count / s.classes_count).toFixed(1) : '0';
      const dbRow = [s.name, s.type];
      if (showStudents) dbRow.push(s.student_count || 0);
      if (showClasses) dbRow.push(s.classes_count || 0);
      dbRow.push(ratio);
      if (showRegion) dbRow.push(s.area || '');

      // 업로드 데이터 값
      const uploadRow = [];
      activeDatasets.forEach((ds) => {
        const { headers, rows } = getDatasetRows ? getDatasetRows(ds) : { headers: [], rows: [] };
        const nameIdx = headers.findIndex((h) => h.includes('학교명'));
        const matchRow = rows.find((r) => r[nameIdx] === s.name);
        headers.slice(3).forEach((h, i) => {
          const val = matchRow ? (matchRow[i + 3] || '') : '';
          // CSV 안전: 쉼표 포함 시 따옴표로 감싸기
          uploadRow.push(val.includes(',') ? `"${val}"` : val);
        });
      });

      csv += [...dbRow, ...uploadRow].join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `세종스쿨이음톡_모아보기_${filteredSchools.length}교.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast(`CSV 다운로드 (${filteredSchools.length}교, ${allHeaders.length}열)`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      {/* SIDEBAR */}
      <div className="space-y-3">
        <SidebarCard title="학교 기본정보 (DB)" dotColor="bg-teal-500">
          <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
            <input type="checkbox" checked disabled className="accent-teal-600 w-4 h-4" /> 학교명 / 학교급
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
            <input type="checkbox" checked={showStudents} onChange={(e) => setShowStudents(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            <span className="flex-1">학생수</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
            <input type="checkbox" checked={showClasses} onChange={(e) => setShowClasses(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            <span className="flex-1">학급수</span>
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer py-1">
            <input type="checkbox" checked={showRegion} onChange={(e) => setShowRegion(e.target.checked)} className="accent-teal-600 w-4 h-4" />
            <span className="flex-1">지역(읍면동)</span>
          </label>
        </SidebarCard>

        <SidebarCard title="업로드 데이터" dotColor="bg-blue-500">
          {(!datasets || datasets.length === 0) ? (
            <div className="text-center py-4 text-[11px] text-slate-400">업로드된 데이터가 없습니다.</div>
          ) : (
            datasets.map((ds) => (
              <div key={ds.id} onClick={() => toggleDataset(ds.id)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all mb-1.5 ${
                  selectedDatasetIds.includes(ds.id) ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-teal-400'
                }`}>
                <div className="text-xs font-bold text-slate-700">{ds.category}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{ds.uploader_name} · {ds.reference_date} · {ds.row_count}행</div>
              </div>
            ))
          )}
        </SidebarCard>

        <SidebarCard title="필터" dotColor="bg-purple-500">
          <div className="mb-2">
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">학교급</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 px-2 text-xs outline-none">
              <option value="">전체</option>
              {Object.keys(TYPE_COLORS).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">지역</label>
            <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-200 px-2 text-xs outline-none">
              <option value="">전체</option>
              <option value="동지역">동지역</option>
              <option value="읍면지역">읍면지역</option>
            </select>
          </div>
        </SidebarCard>
      </div>

      {/* MAIN */}
      <div>
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <SummaryCard value={stats.count.toLocaleString()} label="학교 수" color="text-teal-600" />
          <SummaryCard value={stats.totalStudents.toLocaleString()} label="총 학생수" color="text-blue-600" />
          <SummaryCard value={stats.totalClasses.toLocaleString()} label="총 학급수" color="text-amber-600" />
          <SummaryCard value={stats.ratio} label="학급당 학생수" color="text-purple-600" />
        </div>

        {/* 툴바 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="학교명 검색..." value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs outline-none w-44" />
          </div>
          <div className="ml-auto flex gap-1.5">
            <button onClick={handleDownloadCSV} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">CSV</button>
            <button className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-[11px] font-semibold hover:bg-purple-700 flex items-center gap-1">
              <Bot size={13} /> AI 분석 →
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[480px]">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="bg-slate-50 px-3 py-2.5 text-left font-bold text-slate-500 border-b-2 border-t-[3px] border-t-teal-500 whitespace-nowrap sticky top-0 z-10">학교명</th>
                  <th className="bg-slate-50 px-3 py-2.5 text-left font-bold text-slate-500 border-b-2 border-t-[3px] border-t-teal-500 whitespace-nowrap sticky top-0 z-10">학교급</th>
                  {showStudents && <th className="bg-slate-50 px-3 py-2.5 text-right font-bold text-slate-500 border-b-2 border-t-[3px] border-t-teal-500 whitespace-nowrap sticky top-0 z-10">학생수</th>}
                  {showClasses && <th className="bg-slate-50 px-3 py-2.5 text-right font-bold text-slate-500 border-b-2 border-t-[3px] border-t-teal-500 whitespace-nowrap sticky top-0 z-10">학급수</th>}
                  {showRegion && <th className="bg-slate-50 px-3 py-2.5 text-left font-bold text-slate-500 border-b-2 border-t-[3px] border-t-teal-500 whitespace-nowrap sticky top-0 z-10">지역</th>}
                  {activeDatasets.map((ds) => {
                    const { headers } = getDatasetRows ? getDatasetRows(ds) : { headers: [] };
                    return headers.slice(3).map((h, i) => (
                      <th key={`${ds.id}-${i}`} className="bg-slate-50 px-3 py-2.5 text-right font-bold text-slate-500 border-b-2 border-t-[3px] border-t-blue-500 whitespace-nowrap sticky top-0 z-10">{h}</th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredSchools.map((school) => (
                  <tr key={school.id} className="hover:bg-teal-50/50">
                    <td className="px-3 py-2 border-b border-slate-100 font-semibold text-slate-800 whitespace-nowrap">{school.name}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500">{school.type}</td>
                    {showStudents && <td className="px-3 py-2 border-b border-slate-100 text-right font-mono text-slate-600">{(school.student_count || 0).toLocaleString()}</td>}
                    {showClasses && <td className="px-3 py-2 border-b border-slate-100 text-right font-mono text-slate-600">{(school.classes_count || 0).toLocaleString()}</td>}
                    {showRegion && <td className="px-3 py-2 border-b border-slate-100 text-slate-500">{school.area}</td>}
                    {activeDatasets.map((ds) => {
                      const { headers, rows } = getDatasetRows ? getDatasetRows(ds) : { headers: [], rows: [] };
                      const nameIdx = headers.findIndex((h) => h.includes('학교명'));
                      const matchRow = rows.find((r) => r[nameIdx] === school.name);
                      return headers.slice(3).map((h, i) => (
                        <td key={`${ds.id}-${school.id}-${i}`} className="px-3 py-2 border-b border-slate-100 text-right font-mono text-slate-500 bg-blue-50/30">
                          {matchRow ? matchRow[i + 3] || '—' : '—'}
                        </td>
                      ));
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center pt-3">
          <span className="text-[11px] text-slate-400 flex-1">{stats.count}개교 · {dbColCount}개 컬럼</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB 3: 업로드 내역
// ============================================================
function HistoryTab({ datasets, updateDataset, deleteDataset, showToast, setActiveTab }) {
  const [editingId, setEditingId] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');

  const startEdit = (ds) => {
    setEditingId(ds.id);
    setEditCategory(ds.category || '');
    setEditDate(ds.reference_date || '');
  };

  const saveEdit = async (id) => {
    if (updateDataset) {
      await updateDataset(id, {
        category: editCategory,
        reference_date: editDate,
      });
      showToast('분류가 수정되었습니다');
    }
    setEditingId(null);
  };

  if (!datasets || datasets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="text-5xl mb-3 opacity-20">📁</div>
          <div className="text-sm font-semibold text-slate-500 mb-1">업로드 내역이 없습니다</div>
          <button onClick={() => setActiveTab('upload')}
            className="mt-3 px-4 py-2 rounded-lg border border-teal-600 text-teal-700 text-xs font-semibold hover:bg-teal-50">
            업로드하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {datasets.map((ds) => {
        const isEditing = editingId === ds.id;
        return (
          <div key={ds.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center text-lg flex-shrink-0">📊</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800">{ds.title || ds.category}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {ds.uploader_name} · {ds.created_at ? new Date(ds.created_at).toLocaleDateString('ko-KR') : '—'} · {ds.row_count}행 × {(ds.column_names || []).length}열
                </div>

                {/* 편집 모드 */}
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">분류:</label>
                      <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                        className="h-7 rounded-md border border-teal-300 px-2 text-[11px] outline-none bg-white focus:ring-1 focus:ring-teal-500">
                        {DATA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-semibold text-slate-400">기준일:</label>
                      <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                        className="h-7 rounded-md border border-teal-300 px-2 text-[11px] outline-none bg-white" />
                    </div>
                    <button onClick={() => saveEdit(ds.id)}
                      className="px-3 py-1 rounded-md bg-teal-600 text-white text-[11px] font-semibold hover:bg-teal-700">
                      저장
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1 rounded-md border border-slate-200 text-slate-400 text-[11px] hover:bg-slate-50">
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">{ds.category}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">기준일: {ds.reference_date}</span>
                    {ds._isLocal && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600">로컬</span>}
                    {ds.version > 1 && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600">v{ds.version}</span>}
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              {!isEditing && (
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => startEdit(ds)} title="분류 수정"
                    className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setActiveTab('view')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
                    모아보기
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm('삭제하시겠습니까?')) return;
                    await deleteDataset(ds.id);
                    showToast('삭제되었습니다');
                  }} className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 공용 컴포넌트
// ============================================================
function SidebarCard({ title, dotColor, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-600 flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {title}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function SummaryCard({ value, label, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-center">
      <div className={`font-bold text-xl ${color}`} style={{ fontFamily: 'Outfit, sans-serif' }}>{value}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
