/**
 * Journal Admin API
 * GitHub Contents API proxy — keeps GITHUB_TOKEN server-side
 *
 * Actions (via query param or body):
 *   list       GET  ?action=list&lang=ko|en
 *   read       GET  ?action=read&path=...
 *   save       POST {action:'save', path, content, message, sha?}
 *   delete     POST {action:'delete', path, sha, message}
 *   upload     POST {action:'upload', filename, base64, mime}
 */

const GITHUB_OWNER = 'FAIRPASS';
const GITHUB_REPO = 'fairpass-landing';
const CONTENT_BASE = 'blog-src/src/content';
const IMAGES_BASE = 'blog-src/public/journal-images';

function githubHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

async function ghGet(path) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const res = await fetch(url, { headers: githubHeaders() });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function ghPut(path, content, message, sha) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const body = { message, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;
  const res = await fetch(url, { method: 'PUT', headers: githubHeaders(), body: JSON.stringify(body) });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function ghDelete(path, sha, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: githubHeaders(),
    body: JSON.stringify({ message, sha }),
  });
  const data = res.status === 200 ? await res.json() : {};
  return { ok: res.ok, status: res.status, data };
}

export default async function handler(req, res) {
  // Auth
  const password = req.method === 'GET'
    ? req.query.password
    : (req.body?.password);

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  const action = req.method === 'GET' ? req.query.action : req.body?.action;

  try {
    // ── LIST ──
    if (action === 'list' && req.method === 'GET') {
      const lang = req.query.lang || 'ko';
      const dir = `${CONTENT_BASE}/journal-${lang}`;
      const { ok, data } = await ghGet(dir);
      if (!ok) return res.status(404).json({ error: 'Directory not found', detail: data });
      const files = data
        .filter(f => f.name.endsWith('.md'))
        .map(f => ({ name: f.name, path: f.path, sha: f.sha, slug: f.name.replace('.md', '') }));
      return res.status(200).json({ files });
    }

    // ── READ ──
    if (action === 'read' && req.method === 'GET') {
      const { path } = req.query;
      if (!path) return res.status(400).json({ error: 'path required' });
      const { ok, data } = await ghGet(path);
      if (!ok) return res.status(404).json({ error: 'File not found' });
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return res.status(200).json({ content, sha: data.sha, path: data.path });
    }

    // ── SAVE (create or update) ──
    if (action === 'save' && req.method === 'POST') {
      const { path, content, message, sha } = req.body;
      if (!path || !content) return res.status(400).json({ error: 'path and content required' });
      const commitMsg = message || (sha ? `update: ${path.split('/').pop()}` : `feat: new journal post ${path.split('/').pop()}`);
      let result = await ghPut(path, content, commitMsg, sha || undefined);

      // SHA 충돌(409/422) 시 최신 SHA 가져와서 한 번 재시도
      if (!result.ok && (result.status === 409 || result.status === 422)) {
        const current = await ghGet(path);
        if (current.ok) {
          result = await ghPut(path, content, commitMsg, current.data.sha);
        }
      }

      if (!result.ok) return res.status(500).json({ error: 'GitHub write failed', detail: result.data });
      return res.status(200).json({ success: true, sha: result.data.content?.sha });
    }

    // ── DELETE ──
    if (action === 'delete' && req.method === 'POST') {
      const { path, sha } = req.body;
      if (!path || !sha) return res.status(400).json({ error: 'path and sha required' });
      const { ok, data } = await ghDelete(path, sha, `chore: delete ${path.split('/').pop()}`);
      if (!ok) return res.status(500).json({ error: 'GitHub delete failed', detail: data });
      return res.status(200).json({ success: true });
    }

    // ── UPLOAD IMAGE ──
    if (action === 'upload' && req.method === 'POST') {
      const { filename, base64, mime } = req.body;
      if (!filename || !base64) return res.status(400).json({ error: 'filename and base64 required' });
      const safe = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
      const path = `${IMAGES_BASE}/${safe}`;
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
      const res2 = await fetch(url, {
        method: 'PUT',
        headers: githubHeaders(),
        body: JSON.stringify({ message: `upload: journal image ${safe}`, content: base64 }),
      });
      const data = await res2.json();
      if (!res2.ok) return res.status(500).json({ error: 'Image upload failed', detail: data });
      return res.status(200).json({ success: true, url: `/journal/journal-images/${safe}` });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('journal-admin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
