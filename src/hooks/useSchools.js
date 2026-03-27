// src/hooks/useSchools.js
// 통합 학교 데이터 훅 — 로컬 JSON 즉시 로드 + Supabase 선택적 동기화
//
// 데이터 소스 우선순위:
//   1차: src/data/schools.json (173개교 기본정보, 좌표, 홈페이지)
//   2차: src/data/schoolContacts.json (연락처 — staff 전용)
//   3차: Supabase DB (연결 성공 시 자동 갱신, 실패해도 로컬 데이터로 정상 동작)

import { useState, useEffect, useMemo } from 'react';
import schoolsLocal from '../data/schools.json';
import contactsLocal from '../data/schoolContacts.json';
import { supabase } from '../lib/supabase';

// ── 연락처를 학교 ID 기준으로 맵으로 변환 ──
const CONTACTS_MAP = Object.fromEntries(
  contactsLocal.map(c => [c.school_id, c])
);

// ── 로컬 데이터에 연락처 병합 ──
function mergeContacts(schools) {
  return schools.map(s => {
    const c = CONTACTS_MAP[s.id];
    if (!c) return s;
    return {
      ...s,
      principal_name: c.principal?.name || null,
      principal_phone: c.principal?.phone || null,
      vice_principal_name: c.vice_principal?.name || null,
      vice_principal_phone: c.vice_principal?.phone || null,
      admin_name: c.admin?.name || null,
      admin_phone: c.admin?.phone || null,
    };
  });
}

// 초기 데이터: schools.json + schoolContacts.json 병합 (동기적, 즉시 사용 가능)
const INITIAL_DATA = mergeContacts(schoolsLocal);

export function useSchools() {
  const [schools, setSchools] = useState(INITIAL_DATA);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('local'); // 'local' | 'db'

  // ── Supabase에서 최신 데이터 시도 (백그라운드) ──
  useEffect(() => {
    let cancelled = false;

    async function fetchFromDB() {
      try {
        
        const { data, error } = await supabase
          .from('schools')
          .select('id, name, type, sub_type, raw_type, seq, established_date, main_phone, classes_count, special_classes, student_count, region, latitude, longitude, address, homepage, area')
          .order('id');

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('DB 데이터 없음');

        // DB 컬럼명 → 프론트엔드 컬럼명 변환
        const dbSchools = data.map(row => ({
          id: row.id,
          type: row.type,
          subType: row.sub_type,
          rawType: row.raw_type,
          seq: row.seq,
          name: row.name,
          established_date: row.established_date,
          main_phone: row.main_phone,
          classes_count: row.classes_count,
          special_classes: row.special_classes,
          student_count: row.student_count,
          region: row.region,
          latitude: row.latitude,
          longitude: row.longitude,
          address: row.address,
          homepage: row.homepage,
          area: row.area,
        }));

        if (!cancelled) {
          // DB 데이터에도 로컬 연락처 병합 (DB school_contacts는 RLS 보호)
          setSchools(mergeContacts(dbSchools));
          setSource('db');
          console.log('[useSchools] DB에서 학교 데이터 로드 완료 (' + dbSchools.length + '교)');
        }
      } catch (err) {
        console.log('[useSchools] DB 연결 실패 → 로컬 데이터 사용 (' + INITIAL_DATA.length + '교)');
        // 실패해도 이미 INITIAL_DATA가 세팅되어 있으므로 정상 동작
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFromDB();
    return () => { cancelled = true; };
  }, []);

  // ── 통계 ──
  const stats = useMemo(() => {
    const result = {
      total: schools.length,
      totalStudents: 0,
      totalClasses: 0,
      byType: {},
      byRegion: { '동지역': 0, '읍면지역': 0 },
    };

    schools.forEach(s => {
      const count = s.student_count || 0;
      result.totalStudents += count;
      result.totalClasses += s.classes_count || 0;

      // rawType별 집계
      const rt = s.rawType || '기타';
      if (!result.byType[rt]) result.byType[rt] = { count: 0, students: 0 };
      result.byType[rt].count++;
      result.byType[rt].students += count;

      // 지역별 집계
      if (s.region === '동지역') result.byRegion['동지역']++;
      else result.byRegion['읍면지역']++;
    });

    return result;
  }, [schools]);

  return { schools, stats, loading, source };
}

export default useSchools;
