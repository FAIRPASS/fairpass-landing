// =============================================
// FAIRPASS — Portfolio CRUD API
// =============================================
// [Supabase 초기 설정] Supabase SQL Editor에서 실행:
//
// CREATE TABLE portfolio (
//   id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
//   title_ko TEXT NOT NULL DEFAULT '',
//   title_en TEXT DEFAULT '',
//   event_type_ko TEXT DEFAULT '',
//   event_type_en TEXT DEFAULT '',
//   date_start DATE,
//   date_end DATE,
//   location_ko TEXT DEFAULT '',
//   location_en TEXT DEFAULT '',
//   scale TEXT DEFAULT '',
//   comment_ko TEXT DEFAULT '',
//   comment_en TEXT DEFAULT '',
//   main_image TEXT DEFAULT '',
//   sub_images JSONB DEFAULT '[]',
//   region TEXT DEFAULT 'KR',
//   display_order INT DEFAULT 0,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Public read" ON portfolio FOR SELECT USING (true);
//
// [Supabase Storage] Storage 탭 → New bucket → 이름: portfolio → Public 체크
// =============================================

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — public (anon key)
  if (req.method === "GET") {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase
      .from("portfolio")
      .select("*")
      .order("date_start", { ascending: false, nullsFirst: false });
    if (error) return res.status(500).json({ error: error.message });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  }

  // POST / DELETE — admin only (service role key)
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  if (req.method === "POST") {
    const { password: _, id, ...fields } = req.body;
    fields.updated_at = new Date().toISOString();

    // bulk insert (seed)
    if (Array.isArray(req.body.items)) {
      const { error } = await supabase.from("portfolio").insert(req.body.items);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    // bulk order update
    if (Array.isArray(req.body.orders)) {
      for (const { id: oid, display_order } of req.body.orders) {
        const { error } = await supabase
          .from("portfolio")
          .update({ display_order, updated_at: new Date().toISOString() })
          .eq("id", oid);
        if (error) return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true });
    }

    if (id) {
      const { error } = await supabase.from("portfolio").update(fields).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const { error } = await supabase.from("portfolio").insert(fields);
      if (error) return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    const { error } = await supabase.from("portfolio").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
