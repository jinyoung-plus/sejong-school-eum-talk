/**
 * 카카오맵 유틸리티
 * Phase 2에서 지도 탐색 기능 구현 시 사용합니다.
 *
 * ⚠️ 카카오맵 사용 전 필수 설정:
 * 1. https://developers.kakao.com 에서 앱 등록
 * 2. JavaScript 키 복사 → index.html의 appkey 교체
 * 3. 제품설정 > 카카오맵 > 사용설정 ON (빠뜨리면 403)
 * 4. 플랫폼 > Web > 사이트 도메인에 localhost:3000 및 배포 도메인 등록
 */

/** 학교급별 마커 색상 */
export const MARKER_COLORS = {
  유치원:   '#f06292',
  초등학교: '#4285f4',
  중학교:   '#34a853',
  고등학교: '#fbbc05',
  특수학교: '#ab47bc',
  각종학교: '#78909c',
};

/** 세종시 중심 좌표 */
export const SEJONG_CENTER = {
  lat: 36.5040,
  lng: 127.0049,
};

/** 카카오맵 SDK 로드 확인 */
export function isKakaoMapLoaded() {
  return typeof window !== 'undefined' && window.kakao?.maps;
}

/**
 * 커스텀 마커 이미지 SVG 생성
 * @param {string} color - 마커 색상
 * @param {string} label - 마커 라벨 (1자)
 * @returns {string} SVG data URI
 */
export function createMarkerSvg(color, label = '') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="14" cy="13" r="6" fill="white" opacity="0.9"/>
      <text x="14" y="16" text-anchor="middle" font-size="8" font-weight="700"
            fill="${color}" font-family="sans-serif">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * 인포윈도우 HTML 생성
 * @param {Object} school - 학교 데이터
 * @param {boolean} isStaff - 내부 직원 여부
 * @returns {string} HTML 문자열
 */
export function createInfoWindowContent(school, isStaff = false) {
  return `
    <div style="padding:12px;min-width:200px;font-family:Pretendard,sans-serif;">
      <h4 style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1a2636;">
        ${school.name}
      </h4>
      <p style="margin:0 0 8px;font-size:11px;color:#4a6075;">
        ${school.type} · ${school.region}
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;">
        <span style="color:#8ca0b3;">학생수</span>
        <span style="font-weight:600;color:#1a2636;">${school.student_count}명</span>
        <span style="color:#8ca0b3;">학급수</span>
        <span style="font-weight:600;color:#1a2636;">${school.classes_count}학급</span>
        ${school.established_date ? `
          <span style="color:#8ca0b3;">개교일</span>
          <span style="font-weight:600;color:#1a2636;">${school.established_date}</span>
        ` : ''}
      </div>
      <a href="/school/${school.id}"
         style="display:inline-block;margin-top:8px;font-size:11px;color:#0a8a7a;font-weight:600;text-decoration:none;">
        상세보기 →
      </a>
    </div>`;
}

/**
 * 지도 초기화
 * @param {HTMLElement} container - 지도를 렌더링할 DOM 요소
 * @param {Object} options - 옵션 (center, level)
 * @returns {Object} kakao.maps.Map 인스턴스
 */
export function initMap(container, options = {}) {
  if (!isKakaoMapLoaded()) {
    console.error('카카오맵 SDK가 로드되지 않았습니다.');
    return null;
  }

  const { kakao } = window;
  const center = new kakao.maps.LatLng(
    options.center?.lat || SEJONG_CENTER.lat,
    options.center?.lng || SEJONG_CENTER.lng
  );

  return new kakao.maps.Map(container, {
    center,
    level: options.level || 8,
  });
}
