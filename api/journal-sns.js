/**
 * Journal SNS Copy Generator
 * Calls Claude API to generate 5 SNS versions from a journal post.
 * Purpose: Drive traffic to fairpass.world/journal/ — never reveal the full conclusion.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const password = req.body?.password;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { title, body, slug, lang = 'ko' } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const journalUrl = `https://fairpass.world/journal/${lang}/${slug}/`;

  const systemPrompt = `당신은 FAIRPASS B2B 이벤트 플랫폼의 콘텐츠 마케터입니다.
FAIRPASS는 행사 온라인 접수, 현장 QR 체크인, 무인 명찰 출력을 하나로 통합한 B2B SaaS+HW 플랫폼입니다.
SNS 콘텐츠의 핵심 목적: 독자가 fairpass.world/journal/ 을 방문하게 만드는 것.
절대 금지: 글의 핵심 결론·수치를 SNS에서 완전히 공개하는 것.
전략: 가장 궁금한 부분은 숨기고, "링크를 클릭해야만 알 수 있다"는 느낌을 만든다.`;

  const userPrompt = `다음 저널 포스트를 기반으로 SNS 콘텐츠 5종을 생성해주세요.

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Claude API error', detail: err });
    }

    const result = await response.json();
    const rawText = result.content[0].text.trim();
    const jsonStr = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const snsCopy = JSON.parse(jsonStr);

    return res.status(200).json({ success: true, snsCopy });
  } catch (err) {
    console.error('journal-sns error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
