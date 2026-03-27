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

    // DB 저장
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY
      );
      await supabase.from("inquiries").insert({
        type: "quote",
        name: name || "",
        company: org || "",
        email: email || "",
        content: quoteText || "",
        total: quoteTotal || "",
      });
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
    }

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
        <!-- CTA -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;">실제 견적이나 추가 문의는 아래 버튼을 눌러 연락해 주세요.<br>빠르게 답변 드리겠습니다.</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="mailto:fairpass@fairpass.world" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">문의하기</a>
                </td>
                <td>
                  <a href="https://admin.fairpass.co.kr/Login" style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">시작하기 →</a>
                </td>
              </tr>
            </table>
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
        <!-- 추가 안내 섹션 -->
        <tr>
          <td style="padding:0 40px 32px;">
            <!-- 섹션 헤더 -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1a1a2e,#2d1b69);border-radius:10px;padding:16px 22px;margin-bottom:0;">
                  <p style="margin:0;font-size:14px;font-weight:800;color:#fff;letter-spacing:0.03em;">📋 페어패스 등록시스템 도입 추가 안내 사항</p>
                </td>
              </tr>
            </table>

            <!-- 1. 소개 및 강점 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td style="padding:0 0 8px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">1. 페어패스 소개 및 강점</p></td></tr>
            </table>

            <!-- 1-1 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">1) 페어패스 관리자 페이지 ⇄ 무인 키오스크 연동 운영 가능</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">페어패스는 무인 키오스크를 메인으로 운영하고 있습니다. 이를 위해 사전 및 현장 등록 운영을 위한 관리자 페이지와 키오스크를 연동하고 있습니다.</p></td></tr>
              <tr><td style="padding:8px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">행사 등록 운영 준비를 위해 필요한 모든 프로세스는 페어패스 관리자 페이지 안에서 운영 가능합니다.<br><span style="color:#888;">(DB 수집 및 단체 업로드, 명찰 디자인 및 명찰 정보 맵핑, 키오스크 화면 광고 업로드 등)</span></p></td></tr>
            </table>

            <!-- 1-2 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">2) 무분별한 종이 사용 방지 및 예산 절감</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">페어패스 명찰 출력은 자체 개발된 흰 용지에서 명찰 디자인과 명찰 출력 정보가 실시간 맵핑되어 출력됩니다. 따라서 사전에 각 카테고리별 디자인이 적용된 명찰 용지를 별도로 준비(인쇄)하지 않습니다.</p></td></tr>
              <tr><td style="padding:8px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">행사 후 실제 발급된 수 만큼만 정산 청구드립니다.</p></td></tr>
            </table>

            <!-- 1-3 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">3) QR 코드로 단 시간에 명찰 출력 가능</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">페어패스 관리자페이지에 사전등록 DB를 업로드 후, 행사 D-1 또는 행사 당일 오전에 전체 참가자에게 알림톡(카카오톡)을 발송합니다. 알림톡 내에 무인 키오스크에서 명찰 출력이 가능한 입장 QR코드가 함께 전송됩니다.</p></td></tr>
              <tr><td style="padding:8px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">해당 알림톡의 QR코드를 무인 키오스크 중앙에 배치된 QR 리더기에 태깅하면 <strong>10-14초 안에</strong> 모든 정보(디자인+명찰 내 콘텐츠)가 맵핑되어 출력됩니다.</p></td></tr>
              <tr><td style="padding:8px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">키오스크 한 대에서 여러 가지 등록 카테고리(디자인)의 명찰 발급이 가능합니다.</p></td></tr>
            </table>

            <!-- 1-4 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">4) 예산 절감 가능</p></td></tr>
              <tr><td style="padding:4px 0 2px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">무인 키오스크 배치로 별도 등록 부스 설치가 필요하지 않습니다. <span style="color:#888;">(등록부스 설치비 절약)</span></p></td></tr>
              <tr><td style="padding:4px 0 2px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">종이 명찰과 목걸이 줄은 실 출력 및 사용 수량에 따라 정산 청구됩니다. <span style="color:#888;">(미사용분은 청구드리지 않아요)</span></p></td></tr>
              <tr><td style="padding:4px 0 2px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">무인 키오스크 배치로 진행요원 등 안내 인력 수가 반으로 줄어듭니다. <span style="color:#888;">(인건비도 절약되요)</span></p></td></tr>
            </table>

            <!-- 인스타그램 링크 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">아래 링크로 접속하시면 페어패스 키오스크가 현장에서 어떤 방식으로 운영되는지 영상으로 보실 수 있어요!!</p></td></tr>
              <tr><td style="padding:8px 0 0 8px;"><a href="https://www.instagram.com/fairpass_official" style="font-size:12px;color:#7c3aed;font-weight:700;text-decoration:none;">📸 페어패스 인스타그램 →</a></td></tr>
            </table>

            <!-- 구분선 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
            </table>

            <!-- 2. 견적 변동 사항 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 10px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">2. 견적에서 변동 가능한 사항</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">목걸이줄 사양 및 브랜딩(인쇄, A 타입 굵은 줄에만 가능) 여부</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">현장 등록자 등록비 유료 결제 서비스 이용 시 : 수수료 발생 <span style="color:#888;">[총 결제금액의 (국내) 5% / (해외) 8%를 수수료로 차감 후 정산]</span></p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">부가 서비스 : 출입 관리 솔루션 / 회의장 및 오·만찬장 입퇴장 관리 프로그램 등 사용하실 경우 일부 부가 서비스 추가 금액 발생</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">현장 매니저 상주 유무에 따른 인건비 <span style="color:#888;">(*현장에 배치된 운영요원들의 교육 실시 후, 매니저 비상주로도 운영가능)</span></p></td></tr>
            </table>

            <!-- 구분선 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
            </table>

            <!-- 3. 기타 안내 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 10px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">3. 기타 안내 사항</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">참가자 모집을 직접 진행(행사 홈페이지, 별도 등록시스템 또는 구글폼 등)하고 계실 경우, 사전 등록자 명단 엑셀 파일로 저희 시스템에 일괄 업로드하여 운영 가능합니다.<br><span style="color:#7c3aed;font-weight:600;">⇒ 이 경우, 반드시 개인정보 제3자 동의에 페어패스 명시(행사 전 QR 알림톡 발송을 위해)를 부탁드립니다.</span></p></td></tr>
              <tr><td style="padding:8px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">명찰 디자인은 행사 주최 측에서 준비하여 ai 파일로 전달 부탁드리며, 저희가 디자인 진행해드릴 시 일부 디자인 비용이 발생합니다.</p></td></tr>
              <tr><td style="padding:8px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">명찰 앞면과 뒷면에 각각 사진, 개인별 QR코드, 등록 정보 10가지 항목 맵핑하여 출력 가능합니다.</p></td></tr>
              <tr><td style="padding:8px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">키오스크 서비스를 이용하실 경우, 설치 위치에 유선랜과 전기 설치는 발주처에서 준비 부탁드립니다. <span style="color:#888;">(전기용량 70w 소요/1대)</span></p></td></tr>
            </table>
          </td>
        </tr>
        <!-- 푸터 -->
        <tr>
          <td style="background:#f9f9fc;padding:20px 40px;border-top:1px solid #e8e8f0;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;color:#bbb;">본 메일은 자동 발송되는 메일로, 회신이 불가합니다.</p>
            <p style="margin:0;font-size:12px;color:#aaa;">FAIRPASS · fairpass.co.kr</p>
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
      subject: `[FAIRPASS] 야근 줄여주는 행사 운영, 모의 견적서 확인해보세요`,
      html: htmlBody,
    });

    // 2. 내부 알림 발송 (NOTIFY_EMAIL 설정 시)
    if (notifyEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: [notifyEmail, "fairpass@fairpass.world"],
        subject: `[FAIRPASS] 새 모의견적 요청 — ${org || customerName} / ${quoteTotal}`,
        html: `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e,#2d1b69);padding:24px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;">새 모의견적 접수</p>
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
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #e8eaf0;">총 예상 비용</td>
                <td style="padding:10px 14px;font-size:15px;font-weight:800;color:#1a1a2e;border-bottom:1px solid #e8eaf0;">${quoteTotal}</td>
              </tr>
              <tr style="background:#fafbff;">
                <td style="padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;">접수 시각</td>
                <td style="padding:10px 14px;font-size:12px;color:#64748b;">${timestamp || dateStr}</td>
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
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Quote email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
