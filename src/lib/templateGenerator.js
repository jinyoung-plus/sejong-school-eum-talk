/**
 * templateGenerator.js
 * 표준 템플릿 생성 유틸리티
 * - 자료 분류별 추천 컬럼 제공 (추가/수정 자유)
 * - 학교코드(A) + 학교명(B) + 학교급(C) 고정, D열부터 사용자 자유 입력
 * - 대상 학교 범위 필터링
 */

// ===== 자료 분류 정의 =====
// 추가/수정 방법: 이 배열에 객체를 추가하거나 columns를 수정하면 됩니다.
export const DATA_CATEGORIES = [
  {
    value: '시설현황',
    label: '시설현황',
    description: '교실, 특별실, 체육관 등 학교 시설 현황',
    columns: ['교실수(실)', '특별실(실)', '체육관(O/X)', '수영장(O/X)', '건물면적(㎡)', '비고'],
  },
  {
    value: '예산집행',
    label: '예산집행',
    description: '예산 배정 및 집행 현황',
    columns: ['배정예산(천원)', '집행액(천원)', '집행률(%)', '비고'],
  },
  {
    value: '공기질',
    label: '공기질',
    description: '실내 공기질 측정 데이터',
    columns: ['측정일', 'PM10(㎍/㎥)', 'PM2.5(㎍/㎥)', 'CO2(ppm)', '온도(℃)', '습도(%)'],
  },
  {
    value: '학생현황',
    label: '학생현황',
    description: '학년별 학생수, 전출입 현황',
    columns: ['학년', '남학생수(명)', '여학생수(명)', '전입(명)', '전출(명)', '비고'],
  },
  {
    value: '소규모공사',
    label: '소규모공사',
    description: '소규모 수선·공사 현황',
    columns: ['공사명', '공사비(천원)', '착공일', '준공일', '비고'],
  },
  {
    value: '안전점검',
    label: '안전점검',
    description: '소방·안전 시설 점검 현황',
    columns: ['소화기(대)', '옥내소화전(대)', '감지기(개)', '유도등(개)', '점검일', '비고'],
  },
  {
    value: '자유양식',
    label: '자유양식 (빈 템플릿)',
    description: 'D열부터 자유롭게 항목을 추가하세요',
    columns: [],
  },
];

// ===== 대상 학교 범위 옵션 =====
export const SCOPE_OPTIONS = [
  { value: '전체', label: '전체', filter: () => true },
  { value: '유치원', label: '유치원', filter: (s) => s.type === '유치원' },
  { value: '초등학교', label: '초등학교', filter: (s) => s.type === '초등학교' },
  { value: '중학교', label: '중학교', filter: (s) => s.type === '중학교' },
  { value: '고등학교', label: '고등학교', filter: (s) => s.type === '고등학교' },
  { value: '특수학교', label: '특수/각종학교', filter: (s) => ['특수학교', '각종학교'].includes(s.type) },
  { value: '동지역', label: '동지역', filter: (s) => s.region === '동지역' },
  { value: '읍면지역', label: '읍면지역', filter: (s) => s.region === '읍면지역' },
];

/**
 * 선택된 범위에 해당하는 학교 목록 반환
 */
export function filterSchoolsByScope(schools, scopeValue) {
  const option = SCOPE_OPTIONS.find((o) => o.value === scopeValue);
  if (!option) return schools;
  return schools.filter(option.filter);
}

/**
 * 선택된 범위의 학교 수 반환
 */
export function getScopeCount(schools, scopeValue) {
  return filterSchoolsByScope(schools, scopeValue).length;
}

/**
 * CSV 템플릿 생성 + 다운로드
 * - A열: 학교코드, B열: 학교명, C열: 학교급 (고정)
 * - D열~: 자료 분류별 추천 컬럼 (사용자가 자유롭게 변경 가능)
 *
 * @param {Object} options
 * @param {Array} options.schools - 학교 데이터 배열
 * @param {string} options.categoryValue - 자료 분류 값
 * @param {string} options.scopeValue - 대상 학교 범위
 * @returns {number} 생성된 학교 수
 */
export function downloadTemplate({ schools, categoryValue, scopeValue }) {
  const category = DATA_CATEGORIES.find((c) => c.value === categoryValue);
  const filtered = filterSchoolsByScope(schools, scopeValue);

  if (filtered.length === 0) {
    alert('해당 범위에 학교가 없습니다.');
    return 0;
  }

  // 고정 3열 + 자료 분류별 추천 컬럼
  const fixedHeaders = ['학교코드', '학교명', '학교급'];
  const dataHeaders = category ? category.columns : [];
  const allHeaders = [...fixedHeaders, ...dataHeaders];

  // CSV 생성 (BOM 포함)
  let csv = '\uFEFF' + allHeaders.join(',') + '\n';

  // 안내 행 (자유양식이거나 추천 컬럼이 있을 때)
  if (dataHeaders.length === 0) {
    // 자유양식: D열부터 자유롭게 추가하라는 안내
    csv += '# D열부터 자유롭게 항목명과 데이터를 입력하세요. 항목명에 단위를 괄호로 표기해주세요. 예) 소규모공사비(천원)\n';
  }

  filtered.forEach((school) => {
    const row = [
      school.id,
      school.name,
      school.type,
      ...dataHeaders.map(() => ''), // D열부터는 빈칸
    ];
    csv += row.join(',') + '\n';
  });

  // 다운로드
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `세종스쿨이음톡_${categoryValue}_${scopeValue}_템플릿.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filtered.length;
}

/**
 * 업로드된 데이터의 학교명을 DB와 매칭하여 검증
 * - 일부 학교 누락 허용 (경고만 표시, 업로드 차단하지 않음)
 *
 * @param {Array} headers - 파싱된 헤더 배열
 * @param {Array} rows - 파싱된 데이터 행 배열
 * @param {Array} schools - DB 학교 목록
 * @returns {Array} 검증 결과 배열 [{type:'ok'|'warn'|'info', msg:string}]
 */
export function validateUploadData(headers, rows, schools) {
  const results = [];

  // 1. 학교명 컬럼 확인
  const nameColIdx = headers.findIndex(
    (h) => h.includes('학교명') || h.includes('학교이름') || h === 'name'
  );

  if (nameColIdx >= 0) {
    const uploadedNames = rows.map((r) => r[nameColIdx]).filter(Boolean);
    const dbNames = schools.map((s) => s.name);
    const matched = uploadedNames.filter((n) => dbNames.includes(n));
    const unmatched = uploadedNames.filter((n) => !dbNames.includes(n));

    if (matched.length === uploadedNames.length) {
      results.push({ type: 'ok', msg: `학교명 ${matched.length}개 모두 DB와 매칭 완료` });
    } else if (matched.length > 0) {
      results.push({
        type: 'warn',
        msg: `학교명 ${uploadedNames.length}개 중 ${matched.length}개 매칭, ${unmatched.length}개 미매칭 (업로드 가능)`,
      });
      if (unmatched.length <= 5) {
        results.push({
          type: 'info',
          msg: `미매칭 학교: ${unmatched.join(', ')}`,
        });
      }
    } else {
      results.push({
        type: 'warn',
        msg: '학교명이 DB와 매칭되지 않습니다. 학교명 컬럼을 확인해주세요.',
      });
    }
    results.push({ type: 'ok', msg: '필수 컬럼(학교명) 확인 완료' });
  } else {
    results.push({
      type: 'warn',
      msg: '학교명 컬럼을 찾을 수 없습니다. 매칭 없이 업로드됩니다.',
    });
  }

  // 2. 빈 셀 체크
  let emptyCells = 0;
  rows.forEach((r) => r.forEach((c) => { if (c === '' || c === null || c === undefined) emptyCells++; }));
  if (emptyCells === 0) {
    results.push({ type: 'ok', msg: '빈 셀 없음 — 데이터 완결성 양호' });
  } else {
    results.push({
      type: 'info',
      msg: `빈 셀 ${emptyCells}개 발견 (일부 학교 누락이나 빈 항목은 정상입니다)`,
    });
  }

  // 3. 단위 표기 확인
  const dataHeaders = headers.slice(3); // D열부터
  const hasUnit = dataHeaders.filter((h) => /\(.*\)/.test(h));
  const noUnit = dataHeaders.filter((h) => h && !/\(.*\)/.test(h) && h !== '비고');
  if (noUnit.length > 0) {
    results.push({
      type: 'info',
      msg: `항목명에 단위 표기 권장: ${noUnit.map((h) => `"${h}"`).join(', ')} → 예) 소규모공사비(천원), 소화기(대)`,
    });
  } else if (dataHeaders.length > 0) {
    results.push({ type: 'ok', msg: '항목명에 단위가 잘 표기되어 있습니다' });
  }

  // 4. 숫자 컬럼 인식
  const numericHeaders = headers.filter(
    (h) => h.includes('수') || h.includes('면적') || h.includes('예산') ||
           h.includes('천원') || h.includes('비용') || h.includes('률')
  );
  if (numericHeaders.length > 0) {
    results.push({ type: 'ok', msg: `숫자성 컬럼 ${numericHeaders.length}개 자동 인식` });
  }

  // 5. 행 수 안내
  results.push({
    type: 'ok',
    msg: `데이터 ${rows.length}행 × ${headers.length}열 파싱 완료`,
  });

  return results;
}
