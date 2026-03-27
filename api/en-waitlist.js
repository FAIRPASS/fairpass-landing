// =============================================
// FAIRPASS — EN Waitlist / Contact API
// 영문 사이트 이메일 수집: Supabase 저장 + 내부 알림
// =============================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, company, timestamp } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    // Supabase 저장
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY
      );
      await supabase.from("inquiries").insert({
        type: "en_contact",
        email: email || "",
        company: company || "",
        content: `EN 사이트 문의 (${timestamp || new Date().toISOString()})`,
      });
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
    }

    // 내부 알림 이메일 발송
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
      await resend.emails.send({
        from: fromEmail,
        to: "yj@fairpass.world",
        subject: `[FAIRPASS EN] 새 문의 — ${company || email}`,
        text: [
          "=== 영문 사이트 이메일 문의 ===",
          `이메일: ${email}`,
          `회사: ${company || "-"}`,
          `접수 시각: ${timestamp || new Date().toISOString()}`,
        ].join("\n"),
      });
    } catch (mailErr) {
      console.error("Email send error:", mailErr);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("EN waitlist error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
