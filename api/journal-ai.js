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
  const { title, body, slug, lang = 'ko', category = '', keywords = '', figures = '' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const journalUrl = `https://fairpass.world/journal/${lang}/${slug}/`;

  const system = `당신은 FAIRPASS B2B 이벤트 플랫폼의 콘텐츠 마케터입니다.
FAIRPASS는 행사 온라인 접수, 현장 QR 체크인, 무인 명찰 출력을 하나로 통합한 B2B SaaS+HW 플랫폼입니다.

## 브랜드 정보
- 브랜드명: FAIRPASS (페어패스)
- 슬로건: Scan. Print. Go. / 야근 없이 운영하는 주최사, 줄 없이 입장하는 참가자
- 핵심 제품: 100% 친환경 종이명찰(FSC 인증) + 무인 발권 키오스크 + 온오프라인 등록 통합 플랫폼
- 타겟 고객: B2B — 기업/협회/기관 이벤트 담당자, 전시회/컨퍼런스 주최자, MICE 업계 종사자
- 법인: 한국(서울) + 싱가포르
- 브랜드 톤: 전문적이되 딱딱하지 않음, 공감 중심, 솔직하고 실용적, 글로벌 감각

## 공통 원칙
- 모든 결과물은 저널 원문을 기반으로 작성한다. 원문에 없는 사실·수치·고객명·사례·결과를 임의로 만들지 않는다.
- 사실과 해석을 구분하고, 과장·낚시성 표현·근거 없는 단정을 피한다.
- 최종 목적은 독자가 저널을 방문하게 만드는 것이나, 브랜드 신뢰를 해치지 않는 선에서 작성한다.
- 독자가 얻을 수 있는 인사이트 1개는 반드시 제공하되, 핵심 결론 전체·상세 사례·전체 수치·실행 방법 전체는 저널에서 확인하도록 유도한다.
- 독자가 "그래서 실제 방법은?", "결과는?", "우리 행사에도 적용 가능할까?"를 자연스럽게 떠올리게 한다.
- 억지 클릭 유도 문구보다 전문성·신뢰·공감을 우선한다.

## 금지
- 원문에 없는 정보 생성
- 확인되지 않은 수치 생성
- 1등/최초/압도적 등 과장 표현 남용
- SNS만 읽어도 저널을 볼 필요 없게 쓰기
- 정보가 너무 없어 낚시처럼 보이게 쓰기

## 카테고리별 추가 지시
- FAIRPASS 이야기: 브랜드 스토리 중심, 진솔하고 인간적인 톤, 감성 있되 과장 금지
- FAIRPASS 활용법: 실용적, 구매 검토자/운영 실무자 관점, 문제→해결 힌트→저널 유도 구조
- 운영 사례: before/after 구조 우선, 공개 가능한 수치가 있을 때만 사용, 수치 없으면 수치처럼 보이는 표현 금지
- 지속가능한 행사: ESG 담당자/행사 기획자 타겟, 책임감 있고 신뢰감 있는 톤, 환경 관련 표현은 과장 없이 검증 가능한 범위만
- 업계 트렌드: 분석적·권위 있는 톤, 단정 대신 해석 중심, "왜 지금 중요한가"를 먼저 제시
- FAIRPASS 소식: 공식적·간결, 파트너/투자자/미디어도 읽는다는 전제, 업데이트 내용·의미·다음 기대 포인트 중심

## 인스타그램 콘텐츠 작성 규칙

### 현재 운영 방식 (2026년 현재 — @fairpass.world 단일 계정)
- 한국어 타겟(국내 이벤트 담당자)과 영어 타겟(싱가포르/글로벌 MICE)을 1계정에서 동시 커버
- 모든 인스타그램 게시물은 한/영 병기 원칙: 캡션 구조 = 한국어 전문 → 빈 줄 1개 → 영어 전문
- 동일 내용의 한국어/영어 버전을 각각 별도 게시물로 올리지 않는다 (피드 중복·알고리즘 불리)
- 예외: 명확히 한국 전용 또는 싱가포르 전용인 현장 사례는 해당 언어를 메인으로, 반대 언어는 1~2문장 요약만 추가
- 한영 병기 시: 한국어 먼저, 한 줄 공백 후 영어. 기계 번역 금지 — 각 언어의 자연스러운 표현으로 재작성
- 위치 태그: 한국 행사 → Seoul, Korea / 싱가포르 행사 → Singapore / 글로벌 인사이트 → 없음

### 슬라이드 카드 출력 구조 (기본 형식)
- 슬라이드 1 (커버): 시선을 잡는 한 줄 질문 또는 문제 제기 (15자 이내)
- 슬라이드 2–4 (본문): 핵심 메시지 3가지, 각 슬라이드당 텍스트 3줄 이내
- 슬라이드 5 (마무리): 해결책/FAIRPASS 연결 메시지 + 행동유도 문구
- 이모지: 문단 시작에 1개씩, 슬라이드당 최대 1개

### 인스타그램 캡션 작성 규칙
1. 첫 문장은 반드시 타겟 고객의 "고통/불편함"으로 시작 (예: "행사 당일 등록 줄 때문에 힘드셨죠?")
2. FAIRPASS를 직접 홍보하는 문장은 전체의 30% 이하 — 나머지는 인사이트/공감/정보
3. 수치가 있으면 반드시 포함 (예: 대기시간 40% 감소, 플라스틱 90% 감축)
4. CTA는 매 게시물 마지막에 한 가지만: "프로필 링크에서 무료 상담 신청하세요" 또는 "DM으로 문의주세요" 중 택 1
5. 캡션: 3–5문장, 공감형 첫 문장으로 시작, 마지막 문장은 CTA

### 한국어 해시태그 풀 (상황에 맞게 5개 선택)
#페어패스 #FAIRPASS #행사관리 #이벤트운영 #컨벤션 #전시회 #명찰 #친환경명찰
#키오스크 #스마트체크인 #행사자동화 #MICE #그린마이스 #ESG경영 #지속가능한행사

### 영어 해시태그 풀 (상황에 맞게 5개 선택)
#FAIRPASS #EventTech #MICE #Convention #EventManagement #GreenMICE
#EcoEvent #PaperBadge #SmartCheckIn #Kiosk #SustainableEvents #EventAutomation
#RegistrationSystem #SingaporeEvents #ASEANEvents

### 저널 카테고리별 인스타 변환 방향
- FAIRPASS 이야기 → 브랜드 스토리텔링 슬라이드 (창업 배경, 가치관)
- FAIRPASS 활용법 → 제품 교육 슬라이드 ("이렇게 씁니다" 시리즈)
- 운영 사례 → 현장 사진 + 성과 수치 게시물 (사회적 증거)
- 지속가능한 행사 → ESG/친환경 인사이트 (공감형 스토리텔링)
- 업계 트렌드 → 트렌드 정보 공유 (팔로우 가치 높이는 콘텐츠)
- 언론 보도 → 신뢰 증명 게시물 (미디어 클리핑 카드)`;

  const categoryNote = category ? `카테고리: ${category}` : '';
  const keywordsNote = keywords ? `핵심 키워드: ${keywords}` : '';
  const figuresNote = figures ? `공개 가능한 수치/사례: ${figures}` : '공개 가능한 수치/사례: 없음 (임의 생성 금지)';

  const user = `다음 저널 포스트를 기반으로 SNS 콘텐츠 9종을 생성해주세요.

제목: ${title}
${categoryNote}
${keywordsNote}
${figuresNote}
저널 링크: ${journalUrl}

본문:
${body.slice(0, 3000)}

---
반드시 아래 형식으로 정확히 출력하세요. 각 섹션 마커 사이에 해당 내용만 작성:

[LINKEDIN_KR_SHORT]
LinkedIn 국문 짧은 버전 (220자 이내 / 첫 줄: 숫자·질문·반전·현장 문제 중 하나 / 핵심 인사이트 1개 공개 / 해시태그 5개 이내 / 말미에 저널 링크 / B2B 행사 담당자 HR·마케팅·총무·PCO 타겟)

[LINKEDIN_KR_STANDARD]
LinkedIn 국문 표준 버전 (350자 이내 / 동일 원칙 / 짧은 버전보다 맥락 추가)

[LINKEDIN_EN_SHORT]
LinkedIn English — condensed version.
Follow the same strategic principles as STANDARD but compress to: Hook (1 line) + 1 key insight line + CTA line + max 3 hashtags.
No greetings. No filler. Peer-to-peer tone. Include journal link: ${journalUrl}

[LINKEDIN_EN_STANDARD]
LinkedIn English — full post. Follow this structure EXACTLY:

COMPANY CONTEXT:
- FAIRPASS provides: self-service check-in kiosks, online registration platform, FSC-certified eco-friendly paper badges
- Target audience: corporate event managers, MICE professionals, venue operators (Korea, Singapore, global)
- Brand positioning: "Smart. Fast. Sustainable." — not just a badge company, but event infrastructure
- Journal URL: ${journalUrl}

POST STRUCTURE (follow exactly, in this order):
1. [Hook] — Line 1-2 only. Bold claim, surprising stat, or sharp question. Must stop the scroll. No greetings, no "We are excited to share..."
2. [Problem/Insight] — 3-5 lines max. Describe the pain point or industry insight the journal addresses. Use specific numbers or scenarios when available.
3. [Partial Value] — 2-3 lines. Share ONE key insight from the journal — enough to create curiosity, not enough to satisfy it. End with tension: "But that's only part of the story."
4. [CTA] — 1-2 lines. Direct link to the journal article. Example: "The full breakdown is on the FAIRPASS Journal → ${journalUrl}"
5. [Hashtags] — Max 5. Choose from: #EventTech #MICE #CorporateEvents #HybridEvents #EventManagement #Sustainability #ESG #SingaporeEvents #EventPlanning #FAIRPASS

TONE & STYLE:
- Write in English
- Tone: confident, data-informed, peer-to-peer (not salesy)
- Avoid: "We're thrilled", "Excited to announce", "Game-changer"
- Prefer: active voice, short sentences, one idea per line
- The reader is a senior event professional — write to their intelligence
- NO bullet points with emoji overload. Max 2-3 emojis total per post.

Output ONLY the post text. No labels, no commentary.

[INSTAGRAM_COMBINED]
인스타그램 한/영 병기 캡션 (현재 @fairpass.world 단일 계정 운영 방식)
구조: 한국어 캡션 전문 → 빈 줄 1개 → 영어 캡션 전문
한국어: 첫 줄은 행사 운영자/기획자가 공감할 감정 또는 문제 상황 / 짧은 문장·줄바꿈 위주 / 가장 궁금한 지점 직전까지만 공개 / CTA: "전체 내용은 프로필 링크에서 확인하세요 🔗" / 해시태그 10개 이내 (해시태그 풀에서 카테고리에 맞게 5~7개 선택, 필수 포함: #페어패스 #FAIRPASS #MICE)
영어: 같은 구조 / 기계 번역 금지, 영어권 자연스러운 표현으로 재작성 / CTA: "Full story in profile link 🔗" / 해시태그 10개 이내 (해시태그 풀에서 5~7개 선택, 필수 포함: #FAIRPASS #EventTech #MICE)
슬라이드 카드 텍스트: 슬라이드 1 커버(15자 이내 질문/문제 제기) + 슬라이드 2–4 핵심 메시지 3개(각 3줄 이내) + 슬라이드 5 마무리(해결책+CTA)를 [슬라이드 제안] 섹션으로 캡션 아래에 추가

[INSTAGRAM_KR]
(INSTAGRAM_COMBINED에서 한국어 부분만 단독 추출 — 별도 게시물 용도 아닌 참고용)

[INSTAGRAM_EN]
(INSTAGRAM_COMBINED에서 영어 부분만 단독 추출 — 별도 게시물 용도 아닌 참고용)

[NAVER_BLOG]
네이버 블로그 요약 (1000~1500자 / 검색 키워드 자연스럽게 포함 / 도입 문단 → 핵심 인사이트 2~3개 소개 → 결론은 저널로 유도 구조 / 본문에 소제목(##) 2개 이상 사용 / 상세 실행안·최종 결론은 숨기기 / 마지막 문장 고정: "전체 내용 보기 → ${journalUrl}")

[KEYWORDS]
이 SNS 콘텐츠에 사용한 핵심 키워드 (쉼표 구분)

[HIDDEN_POINTS]
저널로 넘긴 포인트 목록 (독자가 저널을 읽어야 알 수 있는 내용, 불릿 형태)`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 4500 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    function extractSection(name) {
      const re = new RegExp(`\\[${name}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`);
      const m = text.match(re);
      return m ? m[1].trim() : '';
    }

    return res.status(200).json({
      success: true,
      linkedinKrShort:    extractSection('LINKEDIN_KR_SHORT'),
      linkedinKrStandard: extractSection('LINKEDIN_KR_STANDARD'),
      linkedinEnShort:    extractSection('LINKEDIN_EN_SHORT'),
      linkedinEnStandard: extractSection('LINKEDIN_EN_STANDARD'),
      instagramCombined:  extractSection('INSTAGRAM_COMBINED'),
      instagramKo:        extractSection('INSTAGRAM_KR'),
      instagramEn:        extractSection('INSTAGRAM_EN'),
      naverBlog:          extractSection('NAVER_BLOG'),
      keywords:           extractSection('KEYWORDS'),
      hiddenPoints:       extractSection('HIDDEN_POINTS'),
    });
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

Return in EXACTLY this format — no other text:

===META===
{"title":"English SEO title","description":"English meta description under 160 chars","category":"English category name","tags":["tag1","tag2","tag3"]}
===BODY===
Full English markdown body here (recreated for international B2B audience, not literal translation)`;
    const r = await claudeCall({ system, user, maxTokens: 4096 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    const metaMatch = text.match(/===META===\s*\n(.*?)\n===BODY===/s);
    const bodyMatch = text.match(/===BODY===\s*\n([\s\S]*)/);
    if (!metaMatch || !bodyMatch) {
      return res.status(500).json({ error: 'Translation failed', detail: 'Response format invalid: ' + text.slice(0, 300) });
    }
    const translated = JSON.parse(metaMatch[1].trim());
    const translatedBody = bodyMatch[1].trim();

    // 카테고리 강제 매핑 (Claude가 임의 영문 카테고리 생성하는 문제 방지)
    const KO_TO_EN_CAT = {
      'FAIRPASS 이야기': 'Our Story',
      'FAIRPASS 활용법': 'How It Works',
      '운영 사례': 'In the Field',
      '지속가능한 행사': 'Sustainable Events',
      '업계 트렌드': 'Industry Trends',
      'FAIRPASS 소식': 'FAIRPASS News',
      '언론 보도': 'In the Press',
      '미디어 클리핑': 'Media Clipping',
    };
    if (category && KO_TO_EN_CAT[category]) translated.category = KO_TO_EN_CAT[category];

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

${translatedBody}
`;
    return res.status(200).json({
      success: true,
      path: `blog-src/src/content/journal-en/${slug}.md`,
      content: mdContent,
      translated: { ...translated, body: translatedBody },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Translation failed', detail: e.message });
  }
}

// ── EN→KO 번역 (미디어 클리핑용) ──────────────────────────────
async function handleTranslateEnToKo(req, res) {
  const { title, description, body, tags } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const system = `당신은 FAIRPASS B2B 이벤트 플랫폼의 전담 번역 에디터입니다.
FAIRPASS는 행사 온라인 접수·QR 체크인·무인 명찰 출력을 통합한 B2B 이벤트 플랫폼입니다.
역할: 영문 저널 포스트를 한국어 독자(기업·기관 행사 담당자, PCO)에 맞게 자연스러운 한국어로 번역합니다.
원칙:
- 사실·수치·브랜드명·링크 보존
- 영어 전문용어는 한국어 + 영어 병기 (예: 키오스크(kiosk), QR 체크인)
- 직역 금지 — 한국 독자에게 자연스러운 문체
- 마크다운 구조(##, **, >, -) 그대로 유지
- FAIRPASS, 페어패스, 키오스크, QR 체크인, 명찰 → **굵게**`;

  const tagsArr = Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(t => t.trim()).filter(Boolean) : []);

  const user = `아래 영문 포스트를 한국어로 번역해주세요.

영문 제목: ${title}
영문 설명: ${description || ''}
태그: ${tagsArr.join(', ')}

본문:
${body}

반드시 아래 형식으로만 반환하세요:

===KO_META===
{"title":"한국어 제목","description":"한국어 설명 160자 이내","tags":["태그1","태그2","태그3"],"slug":"korean-slug-kr"}
===KO_BODY===
(완성된 한국어 마크다운 본문 — ## 소제목으로 시작, H1 제목 본문에 포함 금지)`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 4096 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    const metaMatch = text.match(/===KO_META===\s*\n(.*?)\n===KO_BODY===/s);
    const bodyMatch = text.match(/===KO_BODY===\s*\n([\s\S]*)/);
    if (!metaMatch || !bodyMatch) {
      return res.status(500).json({ error: '번역 실패 — 응답 형식 오류', detail: text.slice(0, 300) });
    }
    let koMeta;
    try { koMeta = JSON.parse(metaMatch[1].trim()); }
    catch (e) { return res.status(500).json({ error: 'KO_META JSON 파싱 오류', detail: metaMatch[1].slice(0, 200) }); }

    const koBody = bodyMatch[1].trim().replace(/^#\s+[^\n]*\n?/, '').trimStart();
    return res.status(200).json({ success: true, ko: { ...koMeta, body: koBody } });
  } catch (e) {
    return res.status(500).json({ error: '번역 실패', detail: e.message });
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

// ── 미디어 클리핑 (언론 기사 + LinkedIn) ─────────────────────
async function handleExternalImport(req, res) {
  const { url, directText, sourceInfo } = req.body;
  if (!url && !directText) return res.status(400).json({ error: 'url 또는 directText 중 하나가 필요합니다.' });

  let rawText, typeLabel, sourceType, sourceUrl;

  if (directText) {
    // ── 텍스트 직접 입력 모드 ──
    if (directText.trim().length < 30) return res.status(400).json({ error: '기사 본문이 너무 짧습니다 (최소 30자).' });
    rawText = directText.trim().slice(0, 8000);
    typeLabel = '단독 기사';
    sourceType = 'exclusive';
    sourceUrl = (sourceInfo && sourceInfo.url) || '';
  } else {
    // ── URL 크롤링 모드 ──
    const isLinkedIn = /linkedin\.com\/(posts|feed|update|pulse)/.test(url);
    let rawHtml;
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FAIRPASSBot/1.0)' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return res.status(400).json({ error: `URL 접근 실패 (HTTP ${r.status}). LinkedIn은 공개 게시글만 가능합니다.` });
      rawHtml = await r.text();
      if (isLinkedIn && (rawHtml.includes('authwall') || rawHtml.includes('login') && rawHtml.includes('session_redirect'))) {
        return res.status(400).json({ error: 'LinkedIn 로그인이 필요한 게시글입니다. 공개(Public) 게시글 URL을 사용해주세요.' });
      }
      rawText = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);
    } catch (e) {
      return res.status(400).json({ error: `URL 가져오기 실패: ${e.message}` });
    }
    typeLabel = isLinkedIn ? 'LinkedIn' : '언론 기사';
    sourceType = isLinkedIn ? 'linkedin' : 'news';
    sourceUrl = url;
  }

  // 단독 기사 모드: sourceInfo로 출처 힌트 제공
  const si = sourceInfo || {};
  const exclusiveHint = sourceType === 'exclusive'
    ? `\n매체명 힌트: ${si.outlet || '(없음)'}\n기자/작성자 힌트: ${si.author || '(없음)'}\n배포일 힌트: ${si.date || '(없음)'}\n기사 제목 힌트: ${si.title || '(없음)'}`
    : `\n출처 URL: ${sourceUrl}`;

  const sourceBlockGuide = sourceType === 'exclusive'
    ? '단독/자체 기사: > ✍️ **원문:** FAIRPASS 팀 직접 작성 · YYYY-MM-DD (또는 제공된 매체명과 날짜 사용)'
    : sourceType === 'news'
      ? '언론 기사: > 📰 **출처:** [언론사명](url) · 배포: YYYY-MM-DD · 작성: 기자명'
      : 'LinkedIn: > 💼 **출처:** [작성자명 (게시 채널/회사명)](url) · 게시: YYYY-MM-DD';

  const system = `당신은 FAIRPASS B2B 이벤트 플랫폼의 미디어 클리핑 전담 에디터입니다.
FAIRPASS는 행사 온라인 접수·QR 체크인·무인 명찰 출력을 통합한 B2B 이벤트 플랫폼입니다.

역할: 외부 ${typeLabel}를 FAIRPASS Journal 미디어 클리핑 포스트로 재편집합니다.

핵심 규칙:
- 원문 사실·수치·내용 그대로 보존 (단독 기사는 전문 그대로 마크다운 변환 가능)
- FAIRPASS·페어패스·키오스크·명찰·QR 체크인·등록 시스템 관련 문장/단어 → **굵게** 처리
- 타사 제품·브랜드가 언급된 경우 FAIRPASS 관련 내용 중심으로 재구성 (타사 내용은 축약)
- 출처 블록을 본문 맨 마지막에 반드시 추가
- KO/EN 두 버전 모두 생성

출처 블록 형식:
- ${sourceBlockGuide}

FAIRPASS 하이라이트 기준:
- 반드시 **굵게**: FAIRPASS, 페어패스, 키오스크, 무인발권, 종이명찰, QR 체크인
- 선택적 **굵게**: 행사 등록 자동화, 현장 운영, 명찰 출력 (FAIRPASS 맥락일 때만)`;

  const outletPlaceholder = sourceType === 'exclusive'
    ? (si.outlet || 'FAIRPASS 단독')
    : (sourceType === 'news' ? '언론사명' : '작성자명 (회사/채널명)');
  const authorPlaceholder = sourceType === 'exclusive'
    ? (si.author || 'FAIRPASS 팀')
    : (sourceType === 'news' ? '기자명 또는 편집부' : '작성자명 (게시한 채널/회사)');

  const user = `아래 ${typeLabel} 내용을 FAIRPASS Journal 미디어 클리핑 포스트로 재편집해주세요.
감지 타입: ${typeLabel}${exclusiveHint}

---원문 내용---
${rawText}
---끝---

반드시 아래 형식 그대로 반환하세요. 형식을 절대 바꾸지 마세요:

===SOURCE===
{"type":"${sourceType}","title":"원문 제목 또는 게시글 주제","outlet":"${outletPlaceholder}","author":"${authorPlaceholder}","date":"YYYY-MM-DD","url":"${sourceUrl}"}
===KO_META===
{"title":"국문 제목","description":"국문 설명 160자 이내","tags":["태그1","태그2","태그3"],"slug":"press-slug-kr"}
===KO_BODY===
(국문 마크다운 본문 — FAIRPASS 관련 내용 **굵게** — 마지막에 출처 블록 포함)
===EN_META===
{"title":"English title","description":"English description under 160 chars","tags":["tag1","tag2","tag3"],"slug":"press-slug-en"}
===EN_BODY===
(English markdown body — FAIRPASS related **bold** — source attribution at end)

규칙:
- ===SOURCE=== 줄에는 한 줄 JSON만
- ===KO_META=== / ===EN_META=== 줄에는 각각 한 줄 JSON만
- BODY는 ## 소제목으로 시작 (H1 제목 본문에 포함 금지)
- KO slug 끝: -kr / EN slug 끝: -en`;

  try {
    const r = await claudeCall({ system, user, maxTokens: 4500 });
    if (!r.ok) return res.status(500).json({ error: 'Claude API error', detail: await r.text() });
    const result = await r.json();
    const text = result.content[0].text;

    function extractSection(marker) {
      const re = new RegExp(`===${marker}===\\s*\\n([\\s\\S]*?)(?=\\n===[A-Z_]+===|$)`);
      const m = text.match(re);
      return m ? m[1].trim() : '';
    }

    const sourceRaw = extractSection('SOURCE');
    const koMetaRaw = extractSection('KO_META');
    const enMetaRaw = extractSection('EN_META');
    // 본문 H1 중복 제거 — "# 제목" 으로 시작하는 첫 줄 제거
    function stripLeadingH1(body) {
      return body.replace(/^#\s+[^\n]*\n?/, '').trimStart();
    }
    const koBody = stripLeadingH1(extractSection('KO_BODY'));
    const enBody = stripLeadingH1(extractSection('EN_BODY'));

    let source, koMeta, enMeta;
    try { source = JSON.parse(sourceRaw); } catch(e) {
      return res.status(500).json({ error: 'External import failed', detail: `SOURCE JSON 파싱 오류: ${e.message}\n원문:\n${sourceRaw.slice(0,300)}` });
    }
    try { koMeta = JSON.parse(koMetaRaw); } catch(e) {
      return res.status(500).json({ error: 'External import failed', detail: `KO_META JSON 파싱 오류: ${e.message}\n원문:\n${koMetaRaw.slice(0,300)}` });
    }
    try { enMeta = JSON.parse(enMetaRaw); } catch(e) {
      return res.status(500).json({ error: 'External import failed', detail: `EN_META JSON 파싱 오류: ${e.message}\n원문:\n${enMetaRaw.slice(0,300)}` });
    }

    const today = new Date().toISOString().split('T')[0];
    const pubDate = source.date || today;

    // 소스 YAML 블록 생성
    const sourceYaml = `source:
  type: "${source.type}"
  title: "${(source.title || '').replace(/"/g, '\\"')}"
  outlet: "${(source.outlet || '').replace(/"/g, '\\"')}"
  author: "${(source.author || '').replace(/"/g, '\\"')}"
  date: "${source.date || ''}"
  url: "${source.url || sourceUrl}"`;

    // KO 마크다운 전체 (frontmatter 포함)
    const koContent = `---
title: "${(koMeta.title || '').replace(/"/g, '\\"')}"
description: "${(koMeta.description || '').replace(/"/g, '\\"')}"
pubDate: ${pubDate}
category: "미디어 클리핑"
tags: [${(koMeta.tags || []).map(t => `"${t}"`).join(', ')}]
author: "FAIRPASS 팀"
authorTitle: ""
draft: false
status: draft
${sourceYaml}
---

${koBody}`;

    // EN 마크다운 전체 (frontmatter 포함)
    const enContent = `---
title: "${(enMeta.title || '').replace(/"/g, '\\"')}"
description: "${(enMeta.description || '').replace(/"/g, '\\"')}"
pubDate: ${pubDate}
category: "Media Clipping"
tags: [${(enMeta.tags || []).map(t => `"${t}"`).join(', ')}]
author: "FAIRPASS Team"
authorTitle: ""
draft: false
status: draft
${sourceYaml}
---

${enBody}`;

    return res.status(200).json({
      success: true,
      sourceType,
      source,
      ko: { ...koMeta, content: koContent, body: koBody },
      en: { ...enMeta, content: enContent, body: enBody },
    });
  } catch (e) {
    return res.status(500).json({ error: 'External import failed', detail: e.message });
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

// ── 기사 텍스트 추출 ────────────────────────────────────────

// HTML에서 평문 텍스트 정리
function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// 중첩 div를 열기/닫기 카운팅으로 추출
function extractDivById(html, idStr) {
  const startRe = new RegExp(`<div[^>]+id="${idStr}"[^>]*>`, 'i');
  const m = html.match(startRe);
  if (!m) return null;
  const start = html.indexOf(m[0]) + m[0].length;
  let depth = 1, i = start;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
    else { depth--; if (depth > 0) i = nextClose + 6; else return html.slice(start, nextClose); }
  }
  return null;
}

async function handleFetchArticleText(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let rawHtml;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return res.status(400).json({ error: `URL 접근 실패 (HTTP ${r.status})` });

    // 인코딩 처리: Content-Type 또는 meta charset 확인
    const buf = await r.arrayBuffer();
    const latin = Buffer.from(buf).toString('latin1');

    // charset 감지 (Content-Type 헤더 우선, 없으면 meta 태그)
    let charset = 'utf-8';
    const ctHeader = r.headers.get('content-type') || '';
    const ctMatch = ctHeader.match(/charset=([^\s;]+)/i);
    if (ctMatch) charset = ctMatch[1].toLowerCase();
    else {
      const metaMatch = latin.match(/charset=['""]?([a-zA-Z0-9-]+)/i);
      if (metaMatch) charset = metaMatch[1].toLowerCase();
    }

    if (charset === 'euc-kr' || charset === 'ks_c_5601-1987') {
      try { rawHtml = new TextDecoder('euc-kr').decode(buf); }
      catch { rawHtml = Buffer.from(buf).toString('utf-8'); }
    } else {
      rawHtml = Buffer.from(buf).toString('utf-8');
    }
  } catch (e) {
    return res.status(400).json({ error: `URL 가져오기 실패: ${e.message}` });
  }

  // 스크립트·스타일 제거
  let html = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 사이트별 특화 ID/class 우선 적용 (한국 주요 언론사)
  const knownIds = [
    'articleContetns',    // 네이트
    'articleBodyContents', // 뉴시스
    'dic_area',           // 네이버 뉴스
    'articeBody',         // 네이버 뉴스 구버전
    'newsct_article',     // 네이버 뉴스
    'article-view-content-div', // 뉴스1
    'article_txt',        // 아시아경제
    'articleBody',        // 다수 언론
    'article-body',
    'news-article-body',
  ];
  const knownClasses = [
    'article_view',       // 다음 뉴스
    'news_view',
    'articleView',        // 이데일리
    'article_content',
    'view_con',           // 연합뉴스
    'story-news',         // YNA
    'article-text',
  ];

  let contentHtml = null;

  // 1) 알려진 ID로 div 추출 (중첩 카운팅)
  for (const id of knownIds) {
    if (html.includes(id)) {
      const extracted = extractDivById(html, id);
      if (extracted) {
        const textLen = extracted.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length;
        if (textLen > 100) { contentHtml = extracted; break; }
      }
    }
  }

  // 2) 알려진 class (간단 추출)
  if (!contentHtml) {
    for (const cls of knownClasses) {
      const re = new RegExp(`<[^>]+class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]{200,}?)(?=<div[^>]+class="[^"]*(?:ad|banner|comment|related|more|footer)[^"]*">|$)`, 'i');
      const m = html.match(re);
      if (m && m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().length > 100) {
        contentHtml = m[1]; break;
      }
    }
  }

  // 3) <article> 태그
  if (!contentHtml) {
    const m = html.match(/<article[^>]*>([\s\S]+?)<\/article>/i);
    if (m && m[1].replace(/<[^>]+>/g, '').trim().length > 100) contentHtml = m[1];
  }

  // 4) <main> 태그
  if (!contentHtml) {
    const m = html.match(/<main[^>]*>([\s\S]+?)<\/main>/i);
    if (m && m[1].replace(/<[^>]+>/g, '').trim().length > 100) contentHtml = m[1];
  }

  // 5) 최후 수단: 가장 긴 <p> 연속 블록 추출
  if (!contentHtml) {
    const pTags = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    const paragraphs = pTags
      .map(m => htmlToText(m[1]))
      .filter(t => t.length > 30 && !/^(Copyright|저작권|무단전재|사진=|▶|【|◆)/.test(t));
    if (paragraphs.length > 0) contentHtml = paragraphs.join('\n\n');
  }

  if (!contentHtml) {
    return res.status(400).json({ error: '기사 본문을 추출할 수 없습니다. 해당 사이트는 스크래핑을 차단하고 있을 수 있습니다.' });
  }

  // 광고·관련기사 블록 제거 후 텍스트 변환
  const cleaned = contentHtml
    .replace(/<[^>]*class="[^"]*(?:ad|advertisement|banner|related|more|social|share|comment)[^"]*"[^>]*>[\s\S]*?<\/(?:div|section|aside)>/gi, '')
    .replace(/<(nav|header|footer|aside|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '');

  const text = htmlToText(cleaned);

  if (text.length < 50) {
    return res.status(400).json({ error: '기사 본문을 추출할 수 없습니다.' });
  }

  return res.status(200).json({ text: text.slice(0, 10000), charCount: text.length });
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
  if (action === 'externalImport') return handleExternalImport(req, res);
  if (action === 'fetchArticleText') return handleFetchArticleText(req, res);
  if (action === 'translateEnToKo') return handleTranslateEnToKo(req, res);

  return res.status(400).json({ error: 'Invalid action. Use: sns | translate | import | slug | pressImport | externalImport | fetchArticleText | translateEnToKo' });
}
