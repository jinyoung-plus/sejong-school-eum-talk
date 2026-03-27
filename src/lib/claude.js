// src/lib/claude.js
// 프론트엔드에서 /api/chat 프록시를 통해 Claude API를 호출하는 유틸리티

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Claude API에 메시지를 전송하고 응답을 받습니다.
 * @param {Array} messages - {role: 'user'|'assistant', content: string}[] 형식의 대화 배열
 * @returns {Promise<string>} AI 응답 텍스트
 */
export async function sendMessage(messages) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * 스트리밍 방식으로 Claude API에 메시지를 전송합니다.
 * @param {Array} messages - 대화 배열
 * @param {function} onChunk - 청크 텍스트를 받을 콜백 (chunk: string) => void
 * @param {function} onDone - 완료 콜백 () => void
 * @param {function} onError - 오류 콜백 (err: Error) => void
 * @returns {AbortController} - 호출 취소에 사용
 */
export function sendMessageStream(messages, onChunk, onDone, onError) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 마지막 미완성 줄은 다음 청크와 합침

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              onChunk(event.delta.text);
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }

      onDone?.();
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err);
      }
    }
  })();

  return controller;
}

/**
 * 학교 비교 분석을 요청합니다. (Compare.jsx 용)
 * @param {Array} schools - 비교할 학교 데이터 배열
 * @returns {Promise<string>} 분석 텍스트
 */
export async function analyzeSchools(schools) {
  const schoolList = schools
    .map(
      (s) =>
        `- ${s.name} (${s.type}, ${s.area}, 학생수: ${s.student_count}명, 학급수: ${s.classes_count}학급)`
    )
    .join('\n');

  const prompt = `다음 세종시 학교들을 비교 분석해 주세요:\n\n${schoolList}\n\n학생수, 학급수, 위치(생활권) 측면에서 각 학교의 특징과 차이점을 간결하게 정리하고, 학교 선택 시 참고할 수 있는 인사이트를 3가지 제안해 주세요.`;

  return sendMessage([{ role: 'user', content: prompt }]);
}

/**
 * 통계 데이터 기반 AI 인사이트를 요청합니다. (Statistics.jsx 용)
 * @param {Object} statsData - 통계 데이터 객체
 * @returns {Promise<string>} 인사이트 텍스트
 */
export async function getStatisticsInsight(statsData) {
  const prompt = `세종시 학교 통계 데이터를 분석해 주세요:\n\n${JSON.stringify(statsData, null, 2)}\n\n이 데이터에서 발견되는 핵심 특징 3가지와 정책적 시사점을 간결하게 작성해 주세요.`;

  return sendMessage([{ role: 'user', content: prompt }]);
}
