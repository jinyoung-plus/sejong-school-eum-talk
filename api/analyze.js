/**
 * Vercel Edge Function — Claude API 데이터 분석 프록시
 * 업로드된 데이터를 분석하고 인사이트를 생성합니다.
 */

export const config = { runtime: 'edge' };

const ANALYSIS_SYSTEM_PROMPT = `당신은 세종특별자치시교육청의 데이터 분석 전문가 AI입니다.

역할:
1. 제공된 학교 데이터셋을 분석하여 핵심 발견사항을 도출합니다.
2. 통계적 비교, 추이 분석, 이상치 탐지를 수행합니다.
3. 분석 결과를 바탕으로 실질적인 정책 제안을 합니다.
4. 차트 데이터를 JSON 형식으로 제공합니다.

응답 형식:
{
  "summary": "핵심 요약 (2-3문장)",
  "findings": ["발견사항1", "발견사항2", ...],
  "charts": [
    { "type": "bar|line|pie", "title": "차트 제목", "data": [...] }
  ],
  "recommendations": ["정책 제안1", "정책 제안2", ...],
  "detail": "상세 분석 텍스트 (마크다운)"
}`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { datasets, prompt } = await req.json();

    const userMessage = `다음 데이터를 분석해주세요.

[분석 요청]
${prompt}

[데이터]
${JSON.stringify(datasets).slice(0, 80000)}

위 형식에 맞춰 JSON으로 응답해주세요.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API Error: ${response.status} — ${errorData}`);
    }

    const data = await response.json();
    const content = data.content
      ?.map((block) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n');

    // JSON 파싱 시도
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { detail: content };
    } catch {
      parsed = { detail: content };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Analyze proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
