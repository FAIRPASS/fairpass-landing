/**
 * FAIRPASS Blog Draft Generator
 * Called by GitHub Actions weekly-draft workflow.
 * Calls Claude API to generate a blog post, saves as a markdown file.
 */

import { readdir } from 'fs/promises';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LANG = process.env.LANG || 'ko';
const TOPIC_HINT = process.env.TOPIC_HINT || '';

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

// Get existing slugs to avoid duplication
const contentDir = `blog-src/src/content/blog-${LANG}`;
let existingSlugs = [];
try {
  const files = await readdir(contentDir);
  existingSlugs = files.map(f => f.replace('.md', ''));
} catch {
  existingSlugs = [];
}

const today = new Date().toISOString().split('T')[0];
const topicContext = TOPIC_HINT ? `주제 힌트: ${TOPIC_HINT}` : '';

const systemPrompt = LANG === 'ko'
  ? `당신은 FAIRPASS의 B2B 이벤트 플랫폼 블로그 작성자입니다.
FAIRPASS는 행사 온라인 접수, 현장 QR 체크인, 무인 명찰 출력, 참가자 데이터 관리를 하나로 통합한 B2B 플랫폼입니다.
주요 클라이언트: LG전자, 현대자동차, 삼성생명, POSCO, ADB, APEC, UNWTO, 서울대, 연세대, 고려대, COEX, BEXCO, 한국관광공사 등 800개 이상 기관.
제품: 등록 플랫폼(SaaS), 무인 체크인 키오스크(하드웨어), 100% 종이 명찰(친환경 특허 제품).
타겟 독자: 기업·기관 행사 담당자, PCO/이벤트 대행사, 대학 학술대회 담당자.
가격 정보는 포함하지 마세요 (맞춤 견적 방식).
블로그 포스트는 실용적이고 구체적이어야 하며, SEO와 AEO(AI 검색 최적화)를 위해 FAQ 섹션을 포함해야 합니다.`
  : `You are a blog writer for FAIRPASS, a B2B event management platform.
FAIRPASS integrates online registration, on-site QR check-in, self-service badge printing, and attendee data management into a single platform.
Key clients: LG Electronics, Hyundai Motor, Samsung Life, POSCO, ADB, APEC, UNWTO, Seoul National University, Yonsei University, COEX, BEXCO, Korea Tourism Organization — 800+ organizations.
Products: Registration Platform (SaaS), Self-Service Kiosk (hardware), 100% Paper Badge (eco-certified, patented).
Target readers: Corporate/institutional event managers, PCO agencies, academic conference organizers.
Do not include pricing (custom quotes only).
Posts should be practical, specific, and include a FAQ section for SEO and AEO optimization.`;

const userPrompt = LANG === 'ko'
  ? `다음 JSON 형식으로 블로그 포스트 초안을 작성해주세요.
${topicContext}
기존 포스트 슬러그 (중복 주제 피하기): ${existingSlugs.join(', ')}

JSON 형식:
{
  "slug": "영문-소문자-하이픈-구분-slug",
  "title": "포스트 제목",
  "description": "150자 이내 설명 (SEO용)",
  "category": "카테고리 (접수 운영 / 현장 운영 / 친환경 운영 / 플랫폼 활용 중 하나)",
  "tags": ["태그1", "태그2", "태그3"],
  "faq": [
    {"q": "질문1", "a": "답변1"},
    {"q": "질문2", "a": "답변2"},
    {"q": "질문3", "a": "답변3"}
  ],
  "body": "## 마크다운 형식의 본문\\n\\n최소 800자 이상, 소제목·표·리스트 포함"
}

JSON만 반환하세요. 다른 텍스트 없이.`
  : `Write a blog post draft in the following JSON format.
${topicContext}
Existing post slugs (avoid duplicate topics): ${existingSlugs.join(', ')}

JSON format:
{
  "slug": "lowercase-hyphenated-slug",
  "title": "Post title",
  "description": "Under 160 characters (SEO meta description)",
  "category": "One of: Registration / On-Site Operations / Sustainability / Platform",
  "tags": ["tag1", "tag2", "tag3"],
  "faq": [
    {"q": "Question 1", "a": "Answer 1"},
    {"q": "Question 2", "a": "Answer 2"},
    {"q": "Question 3", "a": "Answer 3"}
  ],
  "body": "## Markdown body content\\n\\nMinimum 600 words, include headings, tables, and lists"
}

Return JSON only. No other text.`;

console.log(`Calling Claude API (lang: ${LANG})...`);

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  }),
});

if (!response.ok) {
  const err = await response.text();
  console.error('Claude API error:', response.status, err);
  process.exit(1);
}

const result = await response.json();
const rawContent = result.content[0].text.trim();

let draft;
try {
  // Strip markdown code fences if present
  const jsonStr = rawContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  draft = JSON.parse(jsonStr);
} catch (e) {
  console.error('Failed to parse Claude response as JSON:', e.message);
  console.error('Raw response:', rawContent.slice(0, 500));
  process.exit(1);
}

const { slug, title, description, category, tags, faq, body } = draft;

if (!slug || !title || !body) {
  console.error('Missing required fields in generated draft');
  process.exit(1);
}

// Build frontmatter
const faqYaml = faq && faq.length > 0
  ? `faq:\n${faq.map(({ q, a }) => `  - q: "${q.replace(/"/g, '\\"')}"\n    a: "${a.replace(/"/g, '\\"')}"`).join('\n')}\n`
  : '';

const tagsYaml = tags && tags.length > 0
  ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]\n`
  : '';

const content = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
pubDate: ${today}
category: "${category}"
${tagsYaml}author: "FAIRPASS ${LANG === 'ko' ? '팀' : 'Team'}"
draft: true
${faqYaml}---

${body}
`;

const outputPath = join(contentDir, `${slug}.md`);
await writeFile(outputPath, content, 'utf-8');

console.log(`✅ Draft created: ${outputPath}`);
console.log(`   Title: ${title}`);
console.log(`   Slug: ${slug}`);
