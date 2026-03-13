// ========================================
// FAIRPASS — Quote Email API (Vercel Serverless)
// 실제 이메일 발송: Resend 사용
// 환경변수 필요:
//   RESEND_API_KEY    - Resend API 키
//   FROM_EMAIL        - 발신 이메일 (예: noreply@fairpass.co.kr)
//   NOTIFY_EMAIL      - 내부 알림 수신 이메일 (FAIRPASS 팀)
// ========================================

import { Resend } from "resend";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, org, email, quoteText, quoteTotal, timestamp } = req.body;

    if (!email || !quoteText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 로그 (Vercel 대시보드에서 확인 가능)
    console.log("=== New Quote Request ===");
    console.log("Name:", name);
    console.log("Org:", org);
    console.log("Email:", email);
    console.log("Total:", quoteTotal);
    console.log("Timestamp:", timestamp);
    console.log("========================");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
    const notifyEmail = process.env.NOTIFY_EMAIL;

    const customerName = name || "고객";
    const dateStr = new Date().toLocaleDateString("ko-KR", {
      year: "numeric", month: "long", day: "numeric"
    });

    // 고객에게 발송되는 이메일 HTML
    const htmlBody = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <!-- 헤더 -->
        <tr>
          <td style="background:linear-gradient(135deg,#8b5cf6,#22d3ee);padding:32px 40px;text-align:center;">
            <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:1px;">FAIRPASS</div>
            <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px;">모의 견적서</div>
          </td>
        </tr>
        <!-- 인사말 -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 8px;font-size:16px;color:#1a1a2e;font-weight:600">${customerName}님, 안녕하세요.</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">요청하신 FAIRPASS 모의 견적서를 보내드립니다.<br>아래 내용을 참고하시고, 추가 문의사항이 있으시면 언제든지 연락해 주세요.</p>
          </td>
        </tr>
        <!-- 발행일 -->
        <tr>
          <td style="padding:16px 40px 0;">
            <p style="margin:0;font-size:12px;color:#999;">발행일: ${dateStr}</p>
          </td>
        </tr>
        <!-- 구분선 -->
        <tr><td style="padding:20px 40px 0;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
        <!-- 견적 내용 -->
        <tr>
          <td style="padding:24px 40px;">
            <pre style="margin:0;font-size:13px;color:#333;line-height:1.8;white-space:pre-wrap;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">${quoteText}</pre>
          </td>
        </tr>
        <!-- 구분선 -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
        <!-- 안내 문구 -->
        <tr>
          <td style="padding:24px 40px;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.7;">
              * 본 견적은 모의 견적이며, 실제 견적과 차이가 있을 수 있습니다.<br>
              * 부가서비스(출입관리·알림톡·문자 등)는 실제 견적 시 반영됩니다.<br>
              * 유료 결제 서비스 이용 시 결제액의 5% (행사 후 정산)
            </p>
          </td>
        </tr>
        <!-- 푸터 -->
        <tr>
          <td style="background:#f9f9fc;padding:20px 40px;border-top:1px solid #e8e8f0;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">FAIRPASS · fairpass.co.kr</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // 1. 고객에게 발송
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `[FAIRPASS] 모의 견적서 — 총 예상 비용 ${quoteTotal}`,
      html: htmlBody,
    });

    // 2. 내부 알림 발송 (NOTIFY_EMAIL 설정 시)
    if (notifyEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: notifyEmail,
        subject: `[FAIRPASS 리드] 모의견적 요청 — ${org || "미기입"} / ${customerName} / ${quoteTotal}`,
        text: [
          `=== 새 모의견적 요청 ===`,
          `담당자: ${customerName}`,
          `소속: ${org || "-"}`,
          `이메일: ${email}`,
          `총 예상 비용: ${quoteTotal}`,
          `요청 시각: ${timestamp}`,
          ``,
          quoteText,
        ].join("\n"),
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Quote email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
