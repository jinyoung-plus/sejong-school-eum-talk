/**
 * useDatasets.js (v2 — 수정판)
 * - xlsx: 동적 import (미설치 시 CSV만 지원, 페이지 크래시 없음)
 * - CSV: 자체 파싱 (외부 패키지 불필요)
 * - Supabase 실패 시 로컬 모드 자동 전환
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useDatasets(user) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===== 데이터셋 목록 조회 =====
  const fetchDatasets = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('uploaded_datasets')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_latest', true)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setDatasets(data || []);
    } catch (err) {
      console.warn('[useDatasets] DB 조회 실패:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchDatasets();
  }, [user, fetchDatasets]);

  // ===== CSV 파싱 (내장) =====
  const parseCSV = useCallback((text) => {
    const lines = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'));

    if (lines.length < 2) {
      throw new Error('데이터가 부족합니다. 헤더와 최소 1행의 데이터가 필요합니다.');
    }

    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().replace(/^\uFEFF/, '').replace(/^"|"$/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      cells.push(current.trim());
      if (cells.some((c) => c !== '')) rows.push(cells);
    }
    return { headers, rows, sheetName: 'Sheet1' };
  }, []);

  // ===== Excel 파싱 (xlsx 동적 import) =====
  const parseExcel = useCallback(async (arrayBuffer) => {
    let XLSX;
    try {
      XLSX = await import('xlsx');
    } catch {
      throw new Error(
        'Excel 파일을 읽으려면 xlsx 패키지가 필요합니다.\n' +
        '터미널에서 실행: npm install xlsx\n' +
        '또는 CSV 파일로 저장하여 업로드하세요.'
      );
    }
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (jsonData.length < 2) throw new Error('데이터가 부족합니다.');
    const headers = jsonData[0].map((h) => String(h).trim());
    const rows = jsonData.slice(1)
      .map((row) => row.map((cell) => (cell == null ? '' : String(cell).trim())))
      .filter((row) => row.some((cell) => cell !== ''));
    return { headers, rows, sheetName };
  }, []);

  // ===== 통합 파일 파싱 =====
  const parseFile = useCallback(
    (file) => {
      return new Promise((resolve, reject) => {
        if (!file) { reject(new Error('파일이 없습니다.')); return; }
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'csv') {
          const reader = new FileReader();
          reader.onload = (e) => {
            try { resolve(parseCSV(e.target.result)); }
            catch (err) { reject(err); }
          };
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsText(file, 'UTF-8');
        } else if (ext === 'xlsx' || ext === 'xls') {
          const reader = new FileReader();
          reader.onload = (e) => {
            parseExcel(e.target.result).then(resolve).catch(reject);
          };
          reader.onerror = () => reject(new Error('파일 읽기 실패'));
          reader.readAsArrayBuffer(file);
        } else {
          reject(new Error('xlsx 또는 csv 파일만 지원합니다.'));
        }
      });
    },
    [parseCSV, parseExcel]
  );

  // ===== 데이터셋 저장 =====
  const uploadDataset = useCallback(
    async ({ headers, rows, metadata }) => {
      const { category, scope, referenceDate, description, filename } = metadata;
      const parsedData = rows.map((row) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] || ''; });
        return obj;
      });
      const uploaderName = user?.email?.split('@')[0] || '사용자';
      const record = {
        school_scope: scope || '전체',
        category: category || '기타',
        reference_date: referenceDate,
        title: `${category} — ${filename}`,
        description: description || '',
        uploader_id: user?.id || null,
        uploader_name: uploaderName,
        parsed_data: parsedData,
        row_count: rows.length,
        column_names: headers,
        is_latest: true, is_deleted: false, version: 1,
        dataset_group_id: `${category}_${scope}`,
      };

      if (supabase && user?.id) {
        try {
          const { data, error: err } = await supabase
            .from('uploaded_datasets').insert(record).select().single();
          if (err) throw err;
          setDatasets((prev) => [data, ...prev]);
          return { success: true, data };
        } catch (err) {
          console.warn('[useDatasets] DB 저장 실패:', err.message);
        }
      }
      // 로컬 폴백
      const localRecord = { ...record, id: `local_${Date.now()}`, created_at: new Date().toISOString(), _isLocal: true };
      setDatasets((prev) => [localRecord, ...prev]);
      return { success: true, data: localRecord, isLocal: true };
    },
    [user]
  );

  // ===== 데이터셋 수정 (분류, 기준일 등) =====
  const updateDataset = useCallback(async (id, updates) => {
    // DB 업데이트
    if (supabase && !String(id).startsWith('local_')) {
      try {
        const { error: err } = await supabase
          .from('uploaded_datasets')
          .update(updates)
          .eq('id', id);
        if (err) throw err;
      } catch (err) {
        console.warn('[useDatasets] DB 수정 실패:', err.message);
      }
    }
    // 로컬 상태 업데이트
    setDatasets((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const updated = { ...d, ...updates };
      // title도 분류명 변경 시 자동 갱신
      if (updates.category) {
        const filename = (d.title || '').split(' — ')[1] || '';
        updated.title = `${updates.category} — ${filename}`;
      }
      return updated;
    }));
    return { success: true };
  }, []);

  // ===== 삭제 =====
  const deleteDataset = useCallback(async (id) => {
    if (supabase && !String(id).startsWith('local_')) {
      try { await supabase.from('uploaded_datasets').update({ is_deleted: true }).eq('id', id); }
      catch (err) { console.warn('[useDatasets] DB 삭제 실패:', err.message); }
    }
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    return { success: true };
  }, []);

  // ===== 데이터셋 → 행 배열 변환 =====
  const getDatasetRows = useCallback((dataset) => {
    if (!dataset) return { headers: [], rows: [] };
    const headers = dataset.column_names || [];
    if (!dataset.parsed_data) return { headers, rows: [] };
    const rows = dataset.parsed_data.map((obj) =>
      headers.map((h) => (obj[h] != null ? String(obj[h]) : ''))
    );
    return { headers, rows };
  }, []);

  return { datasets, loading, error, fetchDatasets, parseFile, uploadDataset, updateDataset, deleteDataset, getDatasetRows };
}
