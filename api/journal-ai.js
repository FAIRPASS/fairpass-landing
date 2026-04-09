/**
 * Journal AI API — unified Claude API endpoint
 * Replaces: journal-sns.js, journal-translate.js
 * Actions: sns | translate | import
 *
 * POST { action, password, ...params }
 */

function claudeCall({ system, user, maxTokens = 2048 }) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
}

function parseJson(text) {
  const clean = text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

// ── SNS 생성 ──────────────────────────────────────────────
async function handleSns(req, res) {
  const { title, body, slug, lang = 'ko' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const journalUrl = `https://fairpass.world/journal/${lang}/${slug}/`;

  const system = `당신은 FAIRPASS B2B 이벤트 플랫폼의 콘텐츠 마케터입니다.
FAIRPASS는 행사 온라인 접수, 현장 QR 체크인, 무인 명찰 출력을 하나로 통합한 B2B SaaS+HW 플랫폼입니다.
SNS 콘텐츠의 핵심 목적: 독자가 fairpass.world/journal/ 을 방문하게 만드는 것.
절대 금지: 글의 핵심 결론·수치를 SNS에서 완전히 공개하는 것.
전략: 가장 궁금한 부분은 숨기고, "링크를 클릭해야만 알 수 있다"는 느낌을 만든다.`;

  const user = `다음 저널 포스트를 기반으로 SNS 콘텐츠 5종을 생성해주세요.

제목: ${title}
본문 요약:
${body.slice(0, 2000)}

링크: ${journalUrl}

JSON 형식으로 반환하세요:
{
  "linkedinKo": "LinkedIn 국문 (200자 이내, 핵심 인사이트 1개 공개 후 '→ 전체 내용' 링크 유도, B2B 담당자 타겟, 말미에 링크 포함)",
  "linkedinEn": "LinkedIn English (under 200 chars, same strategy, targeting Singapore/global B2B event managers, include link at end)",
  "instagramKo": "Instagram 국문 (감성적 첫 문장 + 궁금증 유발 3줄 + 해시태그 10개 + '더 읽기 → 프로필 링크' 유도)",
  "instagramEn": "Instagram English (same structure, English hashtags, global audience)",
  "naverBlog": "네이버 블로그 국문 (본문 핵심 500자 요약, 결론은 숨기고, 마지막에 '전체 내용 보기 → ${journalUrl}' CTA 포함)"
}

JSON만 반환하세요. 다른 텍스트 없이.`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 2048 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const snsCopy = parseJson(result.content[0].text);
    return res.status(200).json({ success: true, ...snsCopy });
  } catch (e) {
    return res.status(500).json({ error: 'SNS generation failed', detail: e.message });
  }
}

// ── 영문 번역 ──────────────────────────────────────────────
async function handleTranslate(req, res) {
  const { title, description, body, category, tags, slug } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const system = `You are a content writer for FAIRPASS, a B2B event management platform used by 800+ organizations including LG Electronics, Hyundai, Samsung, ADB, APEC, and COEX.
Your task: Recreate Korean journal posts for English-speaking B2B event managers in Singapore, Southeast Asia, and globally.
This is NOT a literal translation — adapt context, examples, and tone for an international B2B audience.
Maintain all facts and data. Keep markdown formatting. Include FAQ section if present.
SEO target: English-speaking corporate event managers, PCO agencies, academic conference organizers.`;

  try {
    const tagsArr = Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []);
    const user = `Please recreate the following Korean journal post in English for international B2B event managers.

Original Korean post:
Title: ${title}
Description: ${description || ''}
Category: ${category || ''}
Tags: ${tagsArr.join(', ')}

Body:
${body}

Return JSON format:
{
  "title": "English title (SEO optimized)",
  "description": "English meta description (under 160 chars)",
  "category": "English category name",
  "tags": ["tag1", "tag2", "tag3"],
  "body": "Full English markdown body — recreated for international context, not literal translation"
}

Return JSON only. No other text.`;
    const r = await claudeCall({ system, user, maxTokens: 4096 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const translated = parseJson(result.content[0].text);

    const today = new Date().toISOString().split('T')[0];
    const tagsYaml = translated.tags?.length
      ? `tags: [${translated.tags.map(t => `"${t}"`).join(', ')}]`
      : 'tags: []';

    const mdContent = `---
title: "${(translated.title || title).replace(/"/g, '\\"')}"
description: "${(translated.description || description || '').replace(/"/g, '\\"')}"
pubDate: ${today}
category: "${translated.category || category || ''}"
${tagsYaml}
author: "FAIRPASS Team"
authorTitle: ""
draft: false
status: draft
translationKey: "${slug}"
---

${translated.body}
`;
    return res.status(200).json({
      success: true,
      path: `blog-src/src/content/journal-en/${slug}.md`,
      content: mdContent,
      translated,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Translation failed', detail: e.message });
  }
}

// ── 기존 글 가져오기 (import & reformat) ─────────────────────
async function handleImport(req, res) {
  const { rawText, category = '', mode = 'format' } = req.body;
  if (!rawText || rawText.trim().length < 50) {
    return res.status(400).json({ error: 'rawText is required (min 50 chars)' });
  }

  const systemFormat = `당신은 FAIRPASS 저널의 콘텐츠 에디터입니다.
FAIRPASS는 행사 온라인 접수·QR 체크인·무인 명찰 출력을 통합한 B2B 이벤트 플랫폼입니다.
역할: 네이버 블로그·카카오·다른 플랫폼에서 복사한 원문 텍스트를 FAIRPASS Journal 마크다운으로 재편집합니다.
원문의 사실·수치·내용은 절대 임의로 추가하거나 삭제하지 않습니다.
마크다운 변환 규칙:
- 섹션 구분 → ## 소제목
- 핵심 단어·수치 → **굵게**
- 목록이 있던 곳 → - 또는 1. 리스트
- 비교/표 형태 → 마크다운 표
- 인용·강조 문구 → > 인용 블록
- 이모지: 소제목 앞 1개씩 적절히 배치 (과하지 않게, 비즈니스 톤 유지)
- FAQ가 있으면 ## FAQ 섹션으로 정리
- 글 마지막에 > 핵심 메시지 한 줄 인용 추가`;

  const systemRewrite = `당신은 FAIRPASS 저널의 시니어 콘텐츠 에디터입니다.
FAIRPASS는 행사 온라인 접수·QR 체크인·무인 명찰 출력을 통합한 B2B 이벤트 플랫폼입니다.
역할: 네이버 블로그·카카오 등 개인 플랫폼의 글을 FAIRPASS Journal 스타일 B2B 아티클로 재작성합니다.
재작성 원칙:
- 사실·수치·핵심 내용은 반드시 보존 (임의 추가·삭제 금지)
- 구어체·이모티콘·~요/~해요 말투 → 전문적 서술체로 변환
- 블로그 특유의 반복·군더더기 제거, 문장 다듬기
- FAIRPASS 브랜드 관점에서 가치 있는 인사이트 강조
- 독자: 기업 행사 담당자, PCO, 학회 운영자
마크다운 변환 규칙:
- 섹션 구분 → ## 소제목 (이모지 1개)
- 핵심 단어·수치 → **굵게**
- 목록 → - 또는 1. 리스트
- 비교/표 → 마크다운 표
- 강조 → > 인용 블록
- FAQ 있으면 ## FAQ 섹션으로 정리
- 글 마지막에 > 핵심 메시지 한 줄 인용 추가`;

  const system = mode === 'rewrite' ? systemRewrite : systemFormat;

  const user = `아래 원문 텍스트를 FAIRPASS Journal 마크다운으로 재편집해주세요.
카테고리 힌트: ${category || '자동 판단'}

---원문 시작---
${rawText.slice(0, 6000)}
---원문 끝---

반드시 아래 형식 그대로 반환하세요. 형식을 절대 바꾸지 마세요:

===META===
{"title":"제목","description":"설명 160자 이내","category":"카테고리","tags":["태그1","태그2","태그3","태그4","태그5"],"slug":"english-url-slug-kr"}
===BODY===
(완성된 마크다운 본문 전체)

규칙:
- ===META=== 줄에는 한 줄 JSON만, ===BODY=== 줄 이후엔 마크다운만. 다른 텍스트 없이.
- BODY는 ## 소제목으로 시작. # H1 제목은 절대 본문에 포함하지 않음 (title 필드에 별도 존재).
- category는 반드시 다음 중 하나: FAIRPASS 이야기 | FAIRPASS 활용법 | 운영 사례 | 지속가능한 행사 | 업계 트렌드 | FAIRPASS 소식
- slug는 영어로 된 URL 친화적 슬러그 (소문자, 하이픈 구분, 주제를 잘 나타내는 2~5단어), 끝에 반드시 -kr 붙이기. 예: qr-checkin-guide-kr, paperless-badge-case-kr`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 4096 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    const metaMatch = text.match(/===META===\s*\n(.*?)\n===BODY===/s);
    const bodyMatch = text.match(/===BODY===\s*\n([\s\S]*)/);
    if (!metaMatch || !bodyMatch) {
      return res.status(500).json({ error: 'Import failed', detail: 'Response format invalid: ' + text.slice(0, 200) });
    }

    const meta = JSON.parse(metaMatch[1].trim());
    const body = bodyMatch[1].trim();
    return res.status(200).json({ success: true, ...meta, body });
  } catch (e) {
    return res.status(500).json({ error: 'Import failed', detail: e.message });
  }
}

// ── 언론 보도 URL 가져오기 ────────────────────────────────────
async function handlePressImport(req, res) {
  const { url, sourceLang = 'ko' } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // 1. URL 크롤링
  let rawText;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FAIRPASSBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return res.status(400).json({ error: `URL 접근 실패 (${r.status})` });
    const html = await r.text();
    // HTML 태그 제거 → 순수 텍스트 추출
    rawText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  } catch (e) {
    return res.status(400).json({ error: `URL 가져오기 실패: ${e.message}` });
  }

  const isKo = sourceLang === 'ko';

  const system = isKo
    ? `당신은 FAIRPASS B2B 이벤트 플랫폼의 언론 담당 에디터입니다.
언론 보도 기사를 FAIRPASS Journal '언론 보도' 카테고리 포스트로 재편집합니다.
FAIRPASS는 행사 온라인 접수·QR 체크인·무인 명찰 출력을 통합한 B2B 이벤트 플랫폼입니다.

작성 원칙:
- 기사 핵심 사실·수치만 요약 (전문 복사 금지, 저작권 보호)
- FAIRPASS 또는 행사 운영 관련 의미를 부각
- 본문 마지막에 반드시 원문 출처 링크 포함: > 원문: [기사 제목](${url})
- 전문적 B2B 저널 서술체
- 슬러그는 영어 소문자 + 하이픈, 끝에 -kr 붙이기`
    : `You are a press editor for FAIRPASS, a B2B event management platform.
Reformat press coverage into a FAIRPASS Journal 'In the Press' post.
FAIRPASS integrates online registration, QR check-in, and badge printing for B2B events.

Rules:
- Summarize key facts and figures only (no full reproduction — copyright)
- Highlight relevance to FAIRPASS or B2B event management
- End with source attribution: > Source: [Article title](${url})
- Professional B2B journal tone
- Slug: English lowercase + hyphens, add -en suffix`;

  const user = `아래 기사 텍스트를 FAIRPASS Journal 언론 보도 포스트로 재편집해주세요.
출처 URL: ${url}

---기사 내용---
${rawText}
---끝---

반드시 아래 형식 그대로 반환하세요:

===META===
{"title":"제목","description":"설명 160자 이내","category":"${isKo ? '언론 보도' : 'In the Press'}","tags":["태그1","태그2","태그3"],"slug":"press-article-slug-${isKo ? 'kr' : 'en'}"}
===BODY===
(완성된 마크다운 본문)

규칙: ===META=== 줄에는 한 줄 JSON만, ===BODY=== 줄 이후엔 마크다운만. BODY는 ## 소제목으로 시작.`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 3000 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    const metaMatch = text.match(/===META===\s*\n(.*?)\n===BODY===/s);
    const bodyMatch = text.match(/===BODY===\s*\n([\s\S]*)/);
    if (!metaMatch || !bodyMatch) {
      return res.status(500).json({ error: 'Press import failed', detail: 'Response format invalid: ' + text.slice(0, 200) });
    }
    const meta = JSON.parse(metaMatch[1].trim());
    const body = bodyMatch[1].trim();
    return res.status(200).json({ success: true, ...meta, body, sourceUrl: url, sourceLang });
  } catch (e) {
    return res.status(500).json({ error: 'Press import failed', detail: e.message });
  }
}

// ── 슬러그 생성 ──────────────────────────────────────────────
async function handleSlug(req, res) {
  const { title, lang = 'ko' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const r = await claudeCall({
    system: 'You are a URL slug generator. Return only the slug — no explanation, no quotes, no punctuation.',
    user: `Generate a concise, SEO-friendly English URL slug for this article title.

Title: ${title}
Language: ${lang === 'ko' ? 'Korean' : 'English'}

Rules:
- 3 to 6 words maximum
- lowercase letters and hyphens only
- descriptive of the actual topic/concept
- do NOT include brand names (fairpass, mice, etc.) unless truly essential
- do NOT add -kr or -en suffix (added separately)
- return ONLY the slug, nothing else

Example: "MICE 운영의 패러다임 전환 — 지속가능한 행사 운영 모델" → sustainable-event-operations-model`,
    maxTokens: 30,
  });

  if (!r.ok) return res.status(500).json({ error: 'Claude API error' });
  const result = await r.json();
  const raw = result.content[0].text.trim();
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55);
  return res.status(200).json({ slug });
}

// ── Main handler ──────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://fairpass.world');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const password = req.body?.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { action } = req.body;
  if (action === 'sns')       return handleSns(req, res);
  if (action === 'translate') return handleTranslate(req, res);
  if (action === 'import')    return handleImport(req, res);
  if (action === 'slug')        return handleSlug(req, res);
  if (action === 'pressImport') return handlePressImport(req, res);

  return res.status(400).json({ error: 'Invalid action. Use: sns | translate | import | slug | pressImport' });
}
