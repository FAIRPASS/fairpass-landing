/**
 * Journal Trigger API
 * Triggers GitHub Actions workflow_dispatch for journal-draft.yml
 *
 * POST { password, topic?, category? }
 */

const GITHUB_OWNER = 'FAIRPASS';
const GITHUB_REPO  = 'fairpass-landing';
const WORKFLOW_ID  = 'journal-draft.yml';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://fairpass.world');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, topic = '', category = 'auto' } = req.body || {};

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const validCategories = [
    'auto', 'FAIRPASS 이야기', 'FAIRPASS 활용법', '운영 사례',
    '지속가능한 행사', '업계 트렌드', 'FAIRPASS 소식',
  ];
  const safeCategory = validCategories.includes(category) ? category : 'auto';

  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { topic, category: safeCategory },
        }),
      }
    );

    if (r.status === 204) {
      return res.status(200).json({
        ok: true,
        message: '초안 생성을 요청했습니다. 약 2~3분 후 GitHub PR이 생성되고 이메일 알림이 발송됩니다.',
      });
    }

    const data = await r.json();
    return res.status(r.status).json({ error: data.message || '워크플로우 트리거 실패' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
