/**
 * FAIRPASS Journal Draft Generator
 * Called by GitHub Actions journal-draft workflow (화/목 주 2회).
 * Generates Korean drafts with SEO + AEO optimization.
 *
 * Category rotation:
 *   Tuesday  → FAIRPASS 활용법 | 운영 사례 (교대)
 *   Thursday → FAIRPASS 이야기 | 업계 트렌드 | 지속가능한 행사 (순환)
 */

import { readdir, writeFile } from 'fs/promises';
import { join } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TOPIC_HINT = process.env.TOPIC_HINT || '';
const CATEGORY_HINT = process.env.CATEGORY_HINT || 'auto';

if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

// Determine category rotation based on day of week + existing post count
const contentDir = 'blog-src/src/content/journal-ko';
let existingSlugs = [];
try {
  const files = await readdir(contentDir);
  existingSlugs = files.map(f => f.replace('.md', ''));
} catch {
  existingSlugs = [];
}

const existingCount = existingSlugs.length;
const dayOfWeek = new Date().getDay(); // 2=Tuesday, 4=Thursday

let category = CATEGORY_HINT;
if (category === 'auto') {
  if (dayOfWeek === 2) {
    // Tuesday: 활용법 / 운영 사례 교대
    const tuesdayCategories = ['FAIRPASS 활용법', '운영 사례'];
    category = tuesdayCategories[existingCount % 2];
  } else if (dayOfWeek === 4) {
    // Thursday: 이야기 / 트렌드 / 지속가능 순환
    const thursdayCategories = ['FAIRPASS 이야기', '업계 트렌드', '지속가능한 행사'];
    category = thursdayCategories[Math.floor(existingCount / 2) % 3];
  } else {
    // Manual trigger — default
    category = '업계 트렌드';
  }
}

const today = new Date().toISOString().split('T')[0];
const topicContext = TOPIC_HINT ? `주제 힌트: ${TOPIC_HINT}` : '';

const systemPrompt = `당신은 FAIRPASS의 B2B 이벤트 플랫폼 저널 작성자입니다.
FAIRPASS는 행사 온라인 접수, 현장 QR 체크인, 무인 명찰 출력, 참가자 데이터 관리를 하나로 통합한 B2B 플랫폼입니다.
주요 클라이언트: LG전자, 현대자동차, 삼성생명, POSCO, ADB, APEC, UNWTO, 서울대, 연세대, 고려대, COEX, BEXCO, 한국관광공사 등 800개 이상 기관.
제품: 등록 플랫폼(SaaS), 무인 체크인 키오스크(하드웨어), 100% 종이 명찰(친환경 특허 제품 - 페패).
타겟 독자: 기업·기관 행사 담당자, PCO/이벤트 대행사, 대학 학술대회 담당자.
가격 정보는 포함하지 마세요 (맞춤 견적 방식).

중요 목표:
1. SEO: 행사 담당자가 검색하는 질문형 키워드를 H2 헤딩으로 사용
2. AEO: FAQ 섹션 3개 이상 — AI 검색(ChatGPT, Perplexity, Claude)에서 Featured Answer로 뜨도록
3. FAIRPASS 방문 유도: 본문 자연스럽게 FAIRPASS 솔루션으로 연결`;

const categoryGuides = {
  'FAIRPASS 이야기': '대표 또는 CSO의 시각에서 FAIRPASS의 여정, 비전, 의사결정 스토리 (1인칭 또는 내부자 관점)',
  'FAIRPASS 활용법': '담당자가 실제로 FAIRPASS를 어떻게 세팅하고 활용하는지 — 단계별 실무 가이드',
  '운영 사례': '실제 행사 현장에서 일어난 일 — 문제, 해결 과정, 결과 수치 포함',
  '지속가능한 행사': 'ESG, 친환경 운영, 종이 명찰, 탄소 저감 관련 — 실행 가능한 구체적 방법',
  '업계 트렌드': '이벤트 테크, 행사 운영 트렌드, 데이터 기반 인사이트 — 담당자가 알아야 할 변화',
  'FAIRPASS 소식': 'FAIRPASS 제품 업데이트, 파트너십, 수상, 공식 발표',
};

const userPrompt = `다음 JSON 형식으로 FAIRPASS Journal 저널 포스트 초안을 작성해주세요.

카테고리: ${category}
카테고리 가이드: ${categoryGuides[category] || ''}
${topicContext}
기존 포스트 슬러그 (중복 주제 피하기): ${existingSlugs.join(', ')}

JSON 형식:
{
  "slug": "영문-소문자-하이픈-구분-slug",
  "title": "포스트 제목 (질문형 또는 숫자 포함 권장)",
  "description": "150자 이내 설명 (SEO용 — 핵심 키워드 포함)",
  "category": "${category}",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"],
  "author": "FAIRPASS 팀",
  "authorTitle": "",
  "faq": [
    {"q": "AI 검색에서 뜰 만한 구체적 질문 1", "a": "직접적이고 완결된 답변 (100자 이상)"},
    {"q": "질문 2", "a": "답변 2"},
    {"q": "질문 3", "a": "답변 3"}
  ],
  "body": "## 마크다운 형식 본문\\n\\n최소 1200자 이상, H2 질문형 소제목, 실무 표·리스트 포함"
}

작성 지침:
- H2 소제목은 실제 담당자가 검색할 만한 질문형으로 작성
- 표나 리스트로 정보를 구조화 (스캐너블하게)
- 자연스럽게 FAIRPASS 솔루션으로 연결되는 맥락 포함
- 결론은 명확하게: "FAIRPASS와 함께라면" 식의 CTA로 마무리

JSON만 반환하세요. 다른 텍스트 없이.`;

console.log(`Calling Claude API (category: ${category})...`);

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
  const jsonStr = rawContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  draft = JSON.parse(jsonStr);
} catch (e) {
  console.error('Failed to parse Claude response as JSON:', e.message);
  console.error('Raw response:', rawContent.slice(0, 500));
  process.exit(1);
}

const { slug, title, description, tags, faq, body } = draft;

if (!slug || !title || !body) {
  console.error('Missing required fields in generated draft');
  process.exit(1);
}

const faqYaml = faq && faq.length > 0
  ? `faq:\n${faq.map(({ q, a }) => `  - q: "${q.replace(/"/g, '\\"')}"\n    a: "${a.replace(/"/g, '\\"')}"`).join('\n')}\n`
  : '';

const tagsYaml = tags && tags.length > 0
  ? `tags: [${tags.map(t => `"${t}"`).join(', ')}]`
  : 'tags: []';

const content = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
pubDate: ${today}
category: "${category}"
${tagsYaml}
author: "FAIRPASS 팀"
authorTitle: ""
draft: true
status: draft
snsCopy:
  linkedinKo: ""
  linkedinEn: ""
  instagramKo: ""
  instagramEn: ""
  naverBlog: ""
${faqYaml}---

${body}
`;

const outputPath = join(contentDir, `${slug}.md`);
await writeFile(outputPath, content, 'utf-8');

console.log(`✅ Draft created: ${outputPath}`);
console.log(`   Title: ${title}`);
console.log(`   Category: ${category}`);
console.log(`   Slug: ${slug}`);

// Set output for GitHub Actions
process.stdout.write(`\n::set-output name=title::${title}\n`);
process.stdout.write(`::set-output name=slug::${slug}\n`);
