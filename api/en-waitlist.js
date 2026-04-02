// =============================================
// FAIRPASS — EN Waitlist / Contact API
// 영문 사이트 이메일 수집: Supabase 저장 + 내부 알림
// =============================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = [
  "https://fairpass.world",
  "https://www.fairpass.world",
  "https://fairpass.co.kr",
  "https://www.fairpass.co.kr",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, company, timestamp, website, turnstileToken } = req.body;

    // Honeypot: 봇은 hidden 필드를 채움
    if (website) return res.status(200).json({ success: true });

    if (!email) return res.status(400).json({ error: "Email is required" });

    // Cloudflare Turnstile 검증
    if (!turnstileToken) {
      return res.status(400).json({ error: "Missing verification token" });
    }
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v1/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return res.status(403).json({ error: "Bot verification failed" });
    }

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
