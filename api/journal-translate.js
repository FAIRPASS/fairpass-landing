/**
 * Journal Translation API
 * Calls Claude API to translate/recreate a KO journal post in English.
 * Not a literal translation — rewritten for English-speaking B2B event managers.
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

  const { title, description, body, category, tags, slug } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });

  const systemPrompt = `You are a content writer for FAIRPASS, a B2B event management platform used by 800+ organizations including LG Electronics, Hyundai, Samsung, ADB, APEC, and COEX.
Your task: Recreate Korean journal posts for English-speaking B2B event managers in Singapore, Southeast Asia, and globally.
This is NOT a literal translation — adapt context, examples, and tone for an international B2B audience.
Maintain all facts and data. Keep markdown formatting. Include FAQ section if present.
SEO target: English-speaking corporate event managers, PCO agencies, academic conference organizers.`;

  const userPrompt = `Please recreate the following Korean journal post in English for international B2B event managers.

Original Korean post:
Title: ${title}
Description: ${description || ''}
Category: ${category || ''}
Tags: ${(tags || []).join(', ')}

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
        max_tokens: 4096,
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
    const translated = JSON.parse(jsonStr);

    // Build the English .md frontmatter + body
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
  } catch (err) {
    console.error('journal-translate error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
