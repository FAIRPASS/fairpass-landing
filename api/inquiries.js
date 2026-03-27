// =============================================
// FAIRPASS — Inquiries API
// 문의/요청 저장 및 조회
//
// [Supabase SQL Editor에서 실행]:
// CREATE TABLE inquiries (
//   id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
//   type TEXT NOT NULL,
//   name TEXT DEFAULT '',
//   company TEXT DEFAULT '',
//   position TEXT DEFAULT '',
//   email TEXT DEFAULT '',
//   content TEXT DEFAULT '',
//   total TEXT DEFAULT '',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
// =============================================

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  // POST — 내부 저장용 (quote-email, brochure-email에서 호출)
  if (req.method === "POST") {
    const { _secret, ...data } = req.body;
    if (_secret !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { error } = await supabase.from("inquiries").insert(data);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // GET — 관리자 조회
  if (req.method === "GET") {
    const { password, type } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let query = supabase.from("inquiries").select("*").order("created_at", { ascending: false });
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE — 항목 삭제
  if (req.method === "DELETE") {
    const { password, id } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await supabase.from("inquiries").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
