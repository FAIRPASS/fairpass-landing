/**
 * Newsletter API
 * POST { email, lang, source }           — 구독 등록 (public)
 * POST { action:'list', password }       — 구독자 목록 (admin)
 * POST { action:'export', password }     — CSV 다운로드 (admin)
 */

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, lang = 'ko', source = 'journal', password } = req.body || {};

  // ── Admin: 구독자 목록 / CSV 내보내기 ──────────────────────
  if (action === 'list' || action === 'export') {
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const db = supabase();
    const { data, error } = await db
      .from('newsletter_subscribers')
      .select('id, email, lang, source, subscribed_at, unsubscribed_at')
      .order('subscribed_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    if (action === 'export') {
      const rows = [
        'email,lang,source,subscribed_at,status',
        ...data.map(r =>
          `${r.email},${r.lang},${r.source},${r.subscribed_at},${r.unsubscribed_at ? 'unsubscribed' : 'active'}`
        ),
      ].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
      return res.status(200).send('\uFEFF' + rows); // BOM for Excel 한글 호환
    }

    return res.status(200).json({ subscribers: data, total: data.length });
  }

  // ── Public: 구독 등록 ──────────────────────────────────────
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const db = supabase();
  const { error } = await db
    .from('newsletter_subscribers')
    .insert({ email: email.toLowerCase().trim(), lang, source });

  if (error) {
    if (error.code === '23505') {
      // 이미 구독 중 — 정상 처리 (사용자에겐 성공으로 보여줌)
      return res.status(200).json({ success: true, already: true });
    }
    return res.status(500).json({ error: 'Subscription failed' });
  }

  return res.status(200).json({ success: true });
}
