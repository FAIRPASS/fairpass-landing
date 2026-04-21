// 팔로업 이메일 테스트 발송 스크립트
// 실행: node test-followup-email.mjs
// .env.local에서 RESEND_API_KEY, FROM_EMAIL 읽어서 yj@fairpass.world로 발송

import { readFileSync } from "fs";
import { Resend } from "resend";

// .env.local 파싱
const envContent = readFileSync(".env.local", "utf-8");
const env = Object.fromEntries(
  envContent.replace(/\r/g, "").split("\n")
    .filter(line => line.includes("=") && !line.startsWith("#") && line.trim())
    .map(line => {
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      return [key, val];
    })
);

if (!env.RESEND_API_KEY) {
  console.error("RESEND_API_KEY를 .env.local에서 찾을 수 없습니다.");
  console.error("파싱된 키 목록:", Object.keys(env));
  process.exit(1);
}

const resend = new Resend(env.RESEND_API_KEY);
const fromEmail = env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
const toEmail = "yj@fairpass.world";
const testName = "윤지";

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

async function main() {
  console.log(`발송 대상: ${toEmail}\n`);

  // 1. 모의견적 팔로업
  console.log("1. 모의견적 팔로업 발송 중...");
  const r1 = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `[FAIRPASS 테스트] 모의 견적서, 궁금한 점이 있으신가요?`,
    html: buildQuoteFollowupHtml(testName),
  });
  console.log("   결과:", r1.error ? `오류 - ${r1.error.message}` : `성공 (id: ${r1.data?.id})`);

  // 2. 소개서 팔로업
  console.log("2. 소개서 팔로업 발송 중...");
  const r2 = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `[FAIRPASS 테스트] 소개서를 검토해보셨나요?`,
    html: buildBrochureFollowupHtml(testName),
  });
  console.log("   결과:", r2.error ? `오류 - ${r2.error.message}` : `성공 (id: ${r2.data?.id})`);

  console.log("\n완료!");
}

main().catch(console.error);
