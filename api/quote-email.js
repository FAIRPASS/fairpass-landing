// ========================================
// FAIRPASS — Quote Email API (Vercel Serverless)
// 실제 이메일 발송: Resend 사용
// 환경변수 필요:
//   RESEND_API_KEY    - Resend API 키
//   FROM_EMAIL        - 발신 이메일 (예: noreply@fairpass.co.kr)
//   NOTIFY_EMAIL      - 내부 알림 수신 이메일 (FAIRPASS 팀)
// ========================================

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
    const { name, org, email, phone, quoteText, quoteTotal, timestamp, website, turnstileToken } = req.body;
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";

    // Honeypot: 봇은 hidden 필드를 채움
    if (website) return res.status(200).json({ success: true });

    if (!email || !quoteText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Cloudflare Turnstile 검증 (토큰 있을 때만 검증, 없으면 통과 — 임시)
    if (turnstileToken) {
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
        type: "quote",
        name: name || "",
        company: org || "",
        email: email || "",
        phone: phone || "",
        content: quoteText || "",
        content_original: quoteText || "",
        total: quoteTotal || "",
        ip: ip,
      });
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
    }

    const apiKey = process.env.RESEND_API_KEY || "";
    const resend = new Resend(apiKey);
    const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
    console.log("RESEND_API_KEY prefix:", apiKey.substring(0, 10));
    const notifyEmail = process.env.NOTIFY_EMAIL || "yj@fairpass.world";

    const customerName = name || "고객";

    // 내부 알림 발송 (yj@fairpass.world + fairpass@fairpass.world 둘 다)
    const { error: resendErr } = await resend.emails.send({
      from: fromEmail,
      to: [notifyEmail, "fairpass@fairpass.world"],
      subject: `[FAIRPASS] 새 견적 요청 — ${org || customerName}`,
      html: `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#2d1b69);padding:24px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;">새 견적 요청 접수</p>
            <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#fff;">FAIRPASS 내부 알림</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;overflow:hidden;">
              <tr style="background:#fafbff;">
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;width:30%;border-bottom:1px solid #e8eaf0;">담당자</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #e8eaf0;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #e8eaf0;">소속</td>
                <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #e8eaf0;">${org || "-"}</td>
              </tr>
              <tr style="background:#fafbff;">
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #e8eaf0;">이메일</td>
                <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #e8eaf0;"><a href="mailto:${email}" style="color:#7c3aed;text-decoration:none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #e8eaf0;">전화번호</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1a2e;border-bottom:1px solid #e8eaf0;"><a href="tel:${phone || ''}" style="color:#0ea5e9;text-decoration:none;">${phone || "-"}</a></td>
              </tr>
              <tr style="background:#fafbff;">
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #e8eaf0;">참고 예상 금액</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:800;color:#1a1a2e;border-bottom:1px solid #e8eaf0;">${quoteTotal}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;">접수 시각</td>
                <td style="padding:10px 14px;font-size:12px;color:#64748b;">${timestamp || new Date().toLocaleString("ko-KR")}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;text-transform:uppercase;">견적 상세</p>
            <pre style="margin:0;padding:14px;background:#f8f9fc;border-radius:8px;font-size:12px;color:#333;line-height:1.8;white-space:pre-wrap;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">${quoteText}</pre>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;text-align:center;">
            <a href="https://fairpass.world/admin" style="display:inline-block;padding:10px 24px;background:#1a1a2e;color:#fff;font-size:13px;font-weight:700;border-radius:6px;text-decoration:none;">관리자 페이지에서 확인 →</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9fc;padding:14px 32px;border-top:1px solid #e8e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbb;">FAIRPASS 내부 알림 · 자동 발송</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    });

    if (resendErr) {
      console.error("Resend 발송 오류:", JSON.stringify(resendErr));
      return res.status(500).json({ error: "Email send failed", detail: resendErr.message, keyPrefix: apiKey.substring(0, 10) });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Quote email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
