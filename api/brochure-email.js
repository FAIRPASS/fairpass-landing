// =============================================
// FAIRPASS — Brochure Email API
// 소개서 요청: 이메일 발송 + Supabase DB 저장
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
    const { name, company, position, email, timestamp, website, turnstileToken } = req.body;
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";

    // Honeypot: 봇은 hidden 필드를 채움
    if (website) return res.status(200).json({ success: true });

    if (!email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

    // 최소 제출 시간 검증 (5초 미만 = 봇 속도)
    if (timestamp) {
      const elapsed = Date.now() - new Date(timestamp).getTime();
      if (elapsed < 5000) {
        return res.status(200).json({ success: true });
      }
    }

    // Supabase 클라이언트
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // IP 기반 Rate Limiting (10분간 3회 초과 시 차단)
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", tenMinutesAgo);
      if (count >= 3) {
        return res.status(200).json({ success: true });
      }
    } catch (rateLimitErr) {
      console.error("Rate limit check:", rateLimitErr);
    }

    // DB 저장
    try {
      await supabase.from("inquiries").insert({
        type: "brochure",
        name: name || "",
        company: company || "",
        position: position || "",
        email: email || "",
        ip: ip,
      });
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
    }

    // 이메일 발송
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
    const notifyEmail = process.env.NOTIFY_EMAIL;

    // 내부 알림
    if (notifyEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: notifyEmail,
        subject: `[FAIRPASS 리드] 소개서 요청 — ${company || "미기입"} / ${name}`,
        text: [
          `=== 새 소개서 요청 ===`,
          `이름: ${name}`,
          `소속: ${company || "-"}`,
          `직책: ${position || "-"}`,
          `이메일: ${email}`,
          `요청 시각: ${timestamp || new Date().toLocaleString("ko-KR")}`,
        ].join("\n"),
      });
    }

    // 고객 확인 메일
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `[FAIRPASS] 소개서 요청이 접수되었습니다`,
      html: `
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);padding:32px 40px;text-align:center;">
          <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:1px;">FAIRPASS</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px;">서비스 소개서</div>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 12px;font-size:16px;color:#1a1a2e;font-weight:600">${name}님, 안녕하세요.</p>
          <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
            FAIRPASS 서비스 소개서 요청이 정상적으로 접수되었습니다.<br>
            영업일 기준 1~2일 내 담당자가 이메일로 소개서를 발송해 드리겠습니다.<br><br>
            추가 문의사항은 <strong>fairpass@fairpass.world</strong>로 연락해 주세요.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9fc;padding:20px 40px;border-top:1px solid #e8e8f0;">
          <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">FAIRPASS · fairpass.co.kr</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Brochure email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
