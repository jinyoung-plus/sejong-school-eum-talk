// src/pages/Chat.jsx
// Phase 3 — Claude API 연동 AI 채팅 페이지
// 기능: 스트리밍 응답, 마크다운 렌더링, 퀵칩, 대화 히스토리, 오류 처리

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Send, Loader2, RotateCcw, Sparkles, ChevronRight } from 'lucide-react';
import { sendMessageStream } from '../lib/claude';

// ─────────────────────────────────────────────
// 퀵칩 추천 질문 목록
// ─────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '🏫 우리 동네 학교 찾기', query: '해밀동에 있는 유치원, 초등학교, 중학교, 고등학교를 모두 알려주세요.' },
  { label: '📊 학교 규모 비교', query: '새롬초와 다정초의 학생수, 학급수를 비교해 주세요.' },
  { label: '🆕 2025 신설학교', query: '2025년에 새로 개교한 학교를 알려주세요.' },
  { label: '📋 소규모 학교 현황', query: '학생수 100명 미만인 소규모 학교는 어디에 있나요?' },
  { label: '🔄 전학·입학 절차', query: '세종시로 전학하려면 어떻게 해야 하나요?' },
  { label: '🗺️ 동 vs 읍면 비교', query: '동지역과 읍면지역의 학교 수와 학생수를 비교해 주세요.' },
];

// ─────────────────────────────────────────────
// 간단한 마크다운 → JSX 변환기 (react-markdown 없이)
// ─────────────────────────────────────────────
function MarkdownRenderer({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 헤딩
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1 text-gray-800">{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-900">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">{parseInline(line.slice(2))}</h1>);
    }
    // 수평선
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-gray-200" />);
    }
    // 마크다운 테이블 (| 로 시작하는 줄 묶음)
    else if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // 구분선(---|---) 제거
      const dataLines = tableLines.filter(l => !l.match(/^\|[\s\-|]+\|$/));
      if (dataLines.length > 0) {
        const headers = dataLines[0].split('|').filter(c => c.trim() !== '');
        const rows = dataLines.slice(1);
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {parseInline(h.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.split('|').filter(c => c.trim() !== '');
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 border-b border-gray-100">
                          {parseInline(cell.trim())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    // 불릿 리스트
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            <span>{parseInline(lines[i].slice(2))}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1 my-2">{listItems}</ul>);
      continue;
    }
    // 번호 리스트
    else if (line.match(/^\d+\. /)) {
      const listItems = [];
      let num = 1;
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(
          <li key={i} className="flex gap-2 items-start">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{num}</span>
            <span>{parseInline(lines[i].replace(/^\d+\. /, ''))}</span>
          </li>
        );
        i++;
        num++;
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-1.5 my-2">{listItems}</ol>);
      continue;
    }
    // 빈 줄
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // 일반 텍스트
    else {
      elements.push(<p key={i} className="leading-relaxed">{parseInline(line)}</p>);
    }

    i++;
  }

  return <div className="text-sm text-gray-800 space-y-0.5">{elements}</div>;
}

// 인라인 파싱: **bold**, `code`, [링크](url)
function parseInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // 링크 [텍스트](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(...parseBoldCode(remaining.slice(0, linkMatch.index), key));
        key += 10;
      }
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
           className="text-blue-600 underline hover:text-blue-800">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
      continue;
    }
    parts.push(...parseBoldCode(remaining, key));
    break;
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function parseBoldCode(text, baseKey) {
  const result = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) result.push(text.slice(lastIdx, match.index));
    if (match[2]) {
      result.push(<strong key={baseKey++} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3]) {
      result.push(<code key={baseKey++} className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-blue-700">{match[3]}</code>);
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) result.push(text.slice(lastIdx));
  return result;
}

// ─────────────────────────────────────────────
// 메시지 버블 컴포넌트
// ─────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isStreaming = message.streaming;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 아바타 */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Bot size={16} className="text-white" />
        </div>
      )}

      {/* 말풍선 */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 rounded-tl-sm'
      }`}>
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer text={message.content} />
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse rounded-sm" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 Chat 컴포넌트
// ─────────────────────────────────────────────
export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const lastUserMsgRef = useRef(null); // 사용자 메시지 스크롤 기준
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const initialQuerySent = useRef(false);

  // 홈에서 ?q=... 로 넘어온 경우 자동 전송
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !initialQuerySent.current) {
      initialQuerySent.current = true;
      setSearchParams({}, { replace: true }); // URL 파라미터 제거
      handleSend(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 사용자 메시지 추가 시 → 해당 메시지 위치로 스크롤 (헤더 높이 보정)
  useEffect(() => {
    if (lastUserMsgRef.current) {
      const el = lastUserMsgRef.current;
      const headerHeight = 64; // 고정 헤더 높이
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSend = useCallback(async (query) => {
    const text = (query ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    // 사용자 메시지 추가
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);

    // AI 응답 버블 생성 (스트리밍용 빈 버블)
    const aiId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '', streaming: true }]);
    setIsLoading(true);

    // 히스토리 구성 (API 전달용)
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];

    // 스트리밍 호출
    abortRef.current = sendMessageStream(
      history,
      // onChunk
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      // onDone
      () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m))
        );
        setIsLoading(false);
        inputRef.current?.focus();
      },
      // onError
      (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, content: '죄송합니다. 응답을 가져오는 중 오류가 발생했습니다.', streaming: false }
              : m
          )
        );
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [input, isLoading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setError(null);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">

      {/* ── 헤더 ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-none">스쿨이음 AI</h1>
            <p className="text-xs text-gray-500 mt-0.5">세종시 173개 학교 전문 어시스턴트</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RotateCcw size={13} />
            새 대화
          </button>
        )}
      </div>

      {/* ── 메시지 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* 빈 상태: 환영 메시지 + 퀵칩 */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
              <Bot size={32} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">무엇이든 물어보세요!</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              173개 학교 정보를 한곳에서 검색·비교·분석합니다.<br />
              학교 밖 궁금증도 안내해 드려요.
            </p>

            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleSend(chip.query)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all group shadow-sm"
                >
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 shrink-0" />
                  <span className="font-medium">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 대화 메시지 */}
        {messages.map((msg, idx) => {
          // 가장 마지막 사용자 메시지에 ref 부착 → 스크롤 기준점
          const isLastUser = msg.role === 'user' &&
            messages.slice(idx + 1).every(m => m.role === 'assistant');
          return (
            <div key={msg.id} ref={isLastUser ? lastUserMsgRef : null}>
              <MessageBubble message={msg} />
            </div>
          );
        })}

        {/* 로딩 인디케이터 (스트리밍 중에는 버블 안에 표시되므로 별도 표시 안 함) */}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}

      </div>

      {/* ── 퀵칩 (대화 중) ── */}
      {!isEmpty && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-white border-t border-gray-100">
          {QUICK_CHIPS.slice(0, 4).map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.query)}
              disabled={isLoading}
              className="whitespace-nowrap text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-40 shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 입력창 ── */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="세종시 학교에 대해 무엇이든 질문하세요..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all disabled:bg-gray-50 min-h-[44px] max-h-32"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Enter로 전송 · Shift+Enter로 줄바꿈 · 교육 관련 추가 문의: 세종교육콜센터 ☎ 044-1396
        </p>
      </div>
    </div>
  );
}
