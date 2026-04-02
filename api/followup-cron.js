// =============================================
// FAIRPASS — Follow-up Email Cron Job
// 매일 1회 실행: 모의견적/소개서 요청 3일 후 팔로업 발송
// Vercel Cron: 매일 오전 10시 (KST = UTC+9 → 01:00 UTC)
// 필요 환경변수: CRON_SECRET, SUPABASE_URL, SUPABASE_SECRET_KEY,
//              RESEND_API_KEY, FROM_EMAIL, NOTIFY_EMAIL
// Supabase SQL: ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;
// =============================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Cron 보안: CRON_SECRET 검증
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
  const notifyEmail = process.env.NOTIFY_EMAIL;

  const now = new Date();
  // 3~5일 전 생성 + followup_sent_at IS NULL 인 리드
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  let errors = 0;

  try {
    const { data: leads, error } = await supabase
      .from("inquiries")
      .select("id, type, name, company, email, created_at")
      .in("type", ["quote", "brochure"])
      .gte("created_at", fiveDaysAgo)
      .lte("created_at", threeDaysAgo)
      .is("followup_sent_at", null)
      .not("email", "is", null);

    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ error: "DB query failed", detail: error.message });
    }

    if (!leads || leads.length === 0) {
      return res.status(200).json({ message: "No follow-up leads today", sent: 0 });
    }

    for (const lead of leads) {
      try {
        const isQuote = lead.type === "quote";
        const name = lead.name || "고객";

        const subject = isQuote
          ? `[FAIRPASS] 모의 견적서, 궁금한 점이 있으신가요?`
          : `[FAIRPASS] 소개서를 검토해보셨나요?`;

        const htmlBody = isQuote
          ? buildQuoteFollowupHtml(name)
          : buildBrochureFollowupHtml(name);

        await resend.emails.send({
          from: fromEmail,
          to: lead.email,
          subject,
          html: htmlBody,
        });

        // 내부 알림
        if (notifyEmail) {
          await resend.emails.send({
            from: fromEmail,
            to: notifyEmail,
            subject: `[FAIRPASS 팔로업 발송] ${lead.type} — ${lead.company || lead.name} / ${lead.email}`,
            text: `팔로업 이메일이 자동 발송되었습니다.\n유형: ${lead.type}\n이름: ${lead.name}\n소속: ${lead.company || "-"}\n이메일: ${lead.email}\n원래 요청일: ${lead.created_at}`,
          });
        }

        // followup_sent_at 업데이트
        await supabase
          .from("inquiries")
          .update({ followup_sent_at: now.toISOString() })
          .eq("id", lead.id);

        sent++;
      } catch (emailErr) {
        console.error(`Follow-up error for ${lead.email}:`, emailErr);
        errors++;
      }
    }

    return res.status(200).json({ message: "Follow-up complete", sent, errors });
  } catch (err) {
    console.error("Cron error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ===== 모의견적 팔로업 이메일 =====
function buildQuoteFollowupHtml(name) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);padding:28px 40px;text-align:center;">
            <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">FAIRPASS</div>
            <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">모의 견적 팔로업</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;font-weight:600;">${name}님, 안녕하세요 👋</p>
            <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.8;">
              며칠 전 FAIRPASS 모의 견적서를 요청해 주셨는데,<br>
              혹시 검토해 보셨나요?
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.8;">
              견적에 대해 궁금한 점이 있거나, 실제 행사에 맞는<br>
              맞춤 견적이 필요하시다면 편하게 연락해 주세요.<br>
              빠르게 답변 드리겠습니다.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="mailto:fairpass@fairpass.world" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">문의하기</a>
                </td>
                <td>
                  <a href="https://fairpass.world/#quote" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">견적 다시 확인하기</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#999;line-height:1.7;">
              * 본 메일은 견적 요청 후 자동 발송되는 안내 메일입니다.<br>
              * 더 이상 받고 싶지 않으시면 <a href="mailto:fairpass@fairpass.world?subject=수신거부" style="color:#8b5cf6;">수신 거부</a>해 주세요.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9fc;padding:16px 40px;border-top:1px solid #e8e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbb;">FAIRPASS · fairpass.co.kr</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ===== 소개서 팔로업 이메일 =====
function buildBrochureFollowupHtml(name) {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);padding:28px 40px;text-align:center;">
            <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:1px;">FAIRPASS</div>
            <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:4px;">소개서 팔로업</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1a1a2e;font-weight:600;">${name}님, 안녕하세요 👋</p>
            <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.8;">
              FAIRPASS 서비스 소개서를 검토해 보셨나요?
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.8;">
              소개서 내용에 대해 궁금한 점이 있거나,<br>
              실제 행사에 도입을 검토 중이시라면 편하게 연락해 주세요.<br>
              무료로 시작하실 수 있습니다.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="mailto:fairpass@fairpass.world" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">상담 신청하기</a>
                </td>
                <td>
                  <a href="https://admin.fairpass.co.kr/Join" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;font-size:13px;font-weight:700;border-radius:8px;text-decoration:none;">무료로 시작하기 →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#999;line-height:1.7;">
              * 본 메일은 소개서 요청 후 자동 발송되는 안내 메일입니다.<br>
              * 더 이상 받고 싶지 않으시면 <a href="mailto:fairpass@fairpass.world?subject=수신거부" style="color:#8b5cf6;">수신 거부</a>해 주세요.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f9fc;padding:16px 40px;border-top:1px solid #e8e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbb;">FAIRPASS · fairpass.co.kr</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
