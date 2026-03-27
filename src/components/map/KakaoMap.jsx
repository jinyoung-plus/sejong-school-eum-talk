import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

const SEJONG_CENTER = { lat: 36.5100, lng: 127.0000 };
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY || '';

const MARKER_COLORS = {
  유치원: '#f06292',
  초등학교: '#4285f4',
  중학교: '#34a853',
  고등학교: '#fbbc05',
  특수학교: '#ab47bc',
  각종학교: '#78909c',
};

const TYPE_LABELS = {
  유치원: '유',
  초등학교: '초',
  중학교: '중',
  고등학교: '고',
  특수학교: '특',
  각종학교: '기',
};

function createMarkerSvg(type, highlighted = false) {
  const color = highlighted ? '#ef4444' : (MARKER_COLORS[type] || '#999');
  const label = TYPE_LABELS[type] || '?';
  const size = highlighted ? 'width="38" height="50" viewBox="0 0 38 50"' : 'width="30" height="40" viewBox="0 0 30 40"';
  const r = highlighted ? 19 : 15;
  const cy = highlighted ? 18 : 14;
  const textY = highlighted ? 22 : 17.5;
  const circleR = highlighted ? 9 : 7;
  const fontSize = highlighted ? 13 : 10;
  const path = highlighted
    ? 'M19 0C8.5 0 0 8.5 0 19c0 14.3 19 31 19 31s19-16.7 19-31C38 8.5 29.5 0 19 0z'
    : 'M15 0C6.7 0 0 6.7 0 15c0 11.2 15 25 15 25s15-13.8 15-25C30 6.7 23.3 0 15 0z';

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" ${size}>`
    + `<path d="${path}" fill="${color}" stroke="#fff" stroke-width="${highlighted ? 2 : 1.5}"/>`
    + `<circle cx="${r}" cy="${cy}" r="${circleR}" fill="#fff" opacity="0.95"/>`
    + `<text x="${r}" y="${textY}" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="${color}" font-family="sans-serif">${label}</text>`
    + `</svg>`
  )}`;
}

function createInfoContent(school) {
  return `
    <div style="position:relative;padding:14px 16px;min-width:220px;max-width:300px;font-family:Pretendard,-apple-system,sans-serif;line-height:1.5;">
      <button onclick="document.dispatchEvent(new CustomEvent('close-infowindow'))"
        style="position:absolute;top:8px;right:8px;width:22px;height:22px;border:none;background:#f0f4f8;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#8ca0b3;line-height:1;"
        onmouseover="this.style.background='#dde3ec'" onmouseout="this.style.background='#f0f4f8'">✕</button>
      <div style="font-size:15px;font-weight:800;color:#1a2636;margin-bottom:4px;padding-right:24px;">${school.name}</div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${MARKER_COLORS[school.type]}15;color:${MARKER_COLORS[school.type]};">${school.type}</span>
        <span style="font-size:11px;color:#8ca0b3;">${school.region}</span>
      </div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;">
        <span style="color:#8ca0b3;">학생수</span><span style="font-weight:600;color:#1a2636;">${(school.student_count || 0).toLocaleString()}명</span>
        <span style="color:#8ca0b3;">학급수</span><span style="font-weight:600;color:#1a2636;">${school.classes_count || 0}학급</span>
        ${school.established_date ? `<span style="color:#8ca0b3;">개교일</span><span style="font-weight:600;color:#1a2636;">${school.established_date}</span>` : ''}
        ${school.main_phone ? `<span style="color:#8ca0b3;">전화</span><span style="font-weight:600;color:#1a2636;">${school.main_phone}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button onclick="document.dispatchEvent(new CustomEvent('info-action',{detail:{action:'detail',schoolId:${school.id}}}))"
          style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#0a8a7a;color:#fff;border-radius:8px;font-size:11px;font-weight:600;border:none;cursor:pointer;">상세보기 →</button>
        ${school.homepage ? `<a href="${school.homepage}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#4285f4;color:#fff;border-radius:8px;font-size:11px;font-weight:600;text-decoration:none;">홈페이지 ↗</a>` : ''}
      </div>
    </div>`;
}

const KakaoMap = forwardRef(function KakaoMap({ schools = [], focusSchool = null, onSchoolClick, onInfoAction, className = '' }, ref) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const highlightRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(null);

  // 인포윈도우 닫기 이벤트
  useEffect(() => {
    function handleClose() {
      infoWindowRef.current?.close();
    }
    document.addEventListener('close-infowindow', handleClose);
    return () => document.removeEventListener('close-infowindow', handleClose);
  }, []);

  // 인포윈도우 상세보기 → React Router 네비게이션
  useEffect(() => {
    function handleAction(e) {
      const { action, schoolId } = e.detail || {};
      if (action && schoolId) {
        onInfoAction?.(action, schoolId);
      }
    }
    document.addEventListener('info-action', handleAction);
    return () => document.removeEventListener('info-action', handleAction);
  }, [onInfoAction]);

  // SDK 로드 + 지도 초기화
  useEffect(() => {
    if (!KAKAO_MAP_KEY) {
      setMapError('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.');
      return;
    }

    function initMap() {
      window.kakao.maps.load(() => {
        if (!mapRef.current) return;
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(SEJONG_CENTER.lat, SEJONG_CENTER.lng),
          level: 8,
        });
        map.addControl(new window.kakao.maps.ZoomControl(), window.kakao.maps.ControlPosition.RIGHT);
        map.addControl(new window.kakao.maps.MapTypeControl(), window.kakao.maps.ControlPosition.TOPRIGHT);
        mapInstance.current = map;
        infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1, removable: false });
        setMapReady(true);
      });
    }

    if (window.kakao?.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services,clusterer&autoload=false`;
    script.async = true;
    script.onload = initMap;
    script.onerror = () => setMapError('카카오맵 SDK 로드 실패. API 키를 확인하세요.');
    document.head.appendChild(script);

    return () => {
      markersRef.current.forEach((m) => m.marker.setMap(null));
      markersRef.current = [];
    };
  }, []);

  // 마커 생성
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    const { kakao } = window;
    const map = mapInstance.current;

    markersRef.current.forEach((m) => m.marker.setMap(null));
    markersRef.current = [];
    if (highlightRef.current) {
      highlightRef.current.setMap(null);
      highlightRef.current = null;
    }

    if (schools.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    schools.forEach((school) => {
      if (!school.latitude || !school.longitude) return;

      const position = new kakao.maps.LatLng(school.latitude, school.longitude);
      bounds.extend(position);

      const imageUrl = createMarkerSvg(school.type, false);
      const imageSize = new kakao.maps.Size(30, 40);
      const markerImage = new kakao.maps.MarkerImage(imageUrl, imageSize, { offset: new kakao.maps.Point(15, 40) });

      const marker = new kakao.maps.Marker({
        position, image: markerImage, title: school.name, clickable: true,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        openInfoWindow(map, marker, school);
        onSchoolClick?.(school);
      });

      marker.setMap(map);
      markersRef.current.push({ schoolId: school.id, marker, type: school.type });
    });

    if (schools.length > 1) {
      map.setBounds(bounds, 60);
    } else if (schools.length === 1 && schools[0].latitude) {
      map.setCenter(new kakao.maps.LatLng(schools[0].latitude, schools[0].longitude));
      map.setLevel(4);
    }
  }, [schools, mapReady]);

  // focusSchool 강조
  useEffect(() => {
    if (!mapReady || !mapInstance.current || !focusSchool) return;
    if (!focusSchool.latitude || !focusSchool.longitude) return;

    const { kakao } = window;
    const map = mapInstance.current;

    if (highlightRef.current) {
      highlightRef.current.setMap(null);
      highlightRef.current = null;
    }

    const position = new kakao.maps.LatLng(focusSchool.latitude, focusSchool.longitude);
    const imageUrl = createMarkerSvg(focusSchool.type, true);
    const imageSize = new kakao.maps.Size(38, 50);
    const markerImage = new kakao.maps.MarkerImage(imageUrl, imageSize, { offset: new kakao.maps.Point(19, 50) });

    const highlightMarker = new kakao.maps.Marker({
      position, image: markerImage, title: focusSchool.name, clickable: true, zIndex: 10,
    });

    kakao.maps.event.addListener(highlightMarker, 'click', () => {
      openInfoWindow(map, highlightMarker, focusSchool);
    });

    highlightMarker.setMap(map);
    highlightRef.current = highlightMarker;

    map.setLevel(3);
    map.panTo(position);
    openInfoWindow(map, highlightMarker, focusSchool);
  }, [focusSchool, mapReady]);

  function openInfoWindow(map, marker, school) {
    const iw = infoWindowRef.current;
    if (!iw) return;
    iw.setContent(createInfoContent(school));
    iw.open(map, marker);
  }

  useImperativeHandle(ref, () => ({
    panToSchool() {},
  }), [mapReady]);

  if (mapError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-surface-bg ${className}`}>
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy-300">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p className="font-semibold text-navy-600 mb-2">카카오맵 연동 대기</p>
          <p className="text-xs text-navy-400 max-w-xs">
            .env.local 파일에 카카오맵 키를 추가하세요:<br/>
            <code className="bg-navy-100 px-1.5 py-0.5 rounded text-[11px]">VITE_KAKAO_MAP_KEY=발급받은키</code>
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} style={{ width: '100%', height: '100%' }} />;
});

export default KakaoMap;
export { MARKER_COLORS, TYPE_LABELS };
