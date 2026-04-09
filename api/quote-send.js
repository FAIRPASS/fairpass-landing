// ========================================
// FAIRPASS — Quote Send API (관리자 수동 발송)
// 관리자 페이지에서 "고객에게 발송" 클릭 시 호출
// ========================================

import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

function parseQuoteContent(content) {
  const get = (label) => {
    const m = (content || "").match(new RegExp("- " + label + ": ([^\n]+)"));
    return m ? m[1].trim() : "";
  };
  const detailMatch = (content || "").match(/\[비용 상세\]([\s\S]*?)(\[총계\]|$)/);
  return {
    담당자: get("담당자"),
    소속: get("소속"),
    행사명: get("행사명"),
    행사장소: get("행사 장소"),
    패키지: get("패키지"),
    비용상세: detailMatch ? detailMatch[1].trim() : "",
    총계: (content || "").match(/\[총계\] (.+)/)?.[1]?.trim() || "",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const {
    password, id, customerEmail, customerName,
    quoteContent, quoteTotal, quoteDiscount, quoteNotes,
  } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!customerEmail || !id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.FROM_EMAIL || "FAIRPASS <fairpass@fairpass.world>";
  const name = customerName || "고객";
  const dateStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  const p = parseQuoteContent(quoteContent || "");
  const hasDiscount = quoteDiscount && quoteDiscount.trim() && quoteDiscount.trim() !== "0";

  // 비용 내역 행 생성
  const billingRows = (p.비용상세 || "").split("\n").filter(l => l.trim()).map(l => {
    const parts = l.replace(/^- /, "").split(": ");
    const label = parts[0] || "";
    const val = parts.slice(1).join(": ") || "";
    return `<tr>
      <td style="padding:9px 0;font-size:13px;color:#444;border-bottom:1px solid #f0f1f5;">${label}</td>
      <td style="padding:9px 0;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f0f1f5;">${val}</td>
    </tr>`;
  }).join("");

  // 할인 행 (조건부)
  const discountRow = hasDiscount ? `<tr>
    <td style="padding:9px 0;font-size:13px;color:#16a34a;font-weight:600;border-bottom:1px solid #f0f1f5;">할인</td>
    <td style="padding:9px 0;font-size:13px;font-weight:700;text-align:right;color:#16a34a;border-bottom:1px solid #f0f1f5;">- ${quoteDiscount.trim()}</td>
  </tr>` : "";

  // 신청자 정보 행
  const infoRows = [
    p.담당자 ? `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;color:#94a3b8;width:28%;border-bottom:1px solid #f0f1f5;background:#fafbff;">담당자</td><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #f0f1f5;">${p.담당자}</td></tr>` : "",
    p.소속 ? `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #f0f1f5;background:#fafbff;">소속</td><td style="padding:8px 14px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #f0f1f5;">${p.소속}</td></tr>` : "",
  ].filter(Boolean).join("");

  // 행사 정보 행
  const eventRows = [
    p.행사명 ? `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;color:#94a3b8;width:28%;border-bottom:1px solid #f0f1f5;background:#fafbff;">행사명</td><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #f0f1f5;">${p.행사명}</td></tr>` : "",
    p.행사장소 ? `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #f0f1f5;background:#fafbff;">장소</td><td style="padding:8px 14px;font-size:13px;color:#1a1a2e;border-bottom:1px solid #f0f1f5;">${p.행사장소}</td></tr>` : "",
    p.패키지 ? `<tr><td style="padding:8px 14px;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:1px solid #f0f1f5;background:#fafbff;">패키지</td><td style="padding:8px 14px;font-size:13px;font-weight:600;color:#1a1a2e;border-bottom:1px solid #f0f1f5;">${p.패키지}</td></tr>` : "",
  ].filter(Boolean).join("");

  // 추가 메모 섹션 (조건부)
  const notesSection = (quoteNotes && quoteNotes.trim()) ? `
    <tr><td style="padding:0 40px 24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:0.08em;text-transform:uppercase;">추가 안내</p>
      <div style="background:#f9f7ff;border-left:3px solid #8b5cf6;border-radius:0 6px 6px 0;padding:12px 16px;">
        <p style="margin:0;font-size:13px;color:#444;line-height:1.8;white-space:pre-wrap;">${quoteNotes.trim()}</p>
      </div>
    </td></tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Apple SD Gothic Neo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#2d1b69 60%,#0e4f6b 100%);padding:32px 40px;text-align:center;">
            <div style="color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;">FAIRPASS</div>
            <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:6px;letter-spacing:0.05em;">맞춤 견적서 · Quotation</div>
          </td>
        </tr>

        <!-- 인사말 -->
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 8px;font-size:16px;color:#1a1a2e;font-weight:600;">${name}님, 안녕하세요.</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">요청하신 FAIRPASS 맞춤 견적서를 보내드립니다.<br>아래 내용을 확인하시고, 추가 문의사항이 있으시면 언제든지 연락해 주세요.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 40px 20px;">
            <p style="margin:0;font-size:12px;color:#999;">발행일: ${dateStr}</p>
          </td>
        </tr>

        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>

        ${infoRows || eventRows ? `
        <!-- 신청자 + 행사 정보 -->
        <tr>
          <td style="padding:24px 40px 0;">
            ${infoRows ? `
            <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:0.12em;color:#8b5cf6;text-transform:uppercase;">신청자 정보</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              ${infoRows}
            </table>` : ""}
            ${eventRows ? `
            <p style="margin:0 0 8px;font-size:10px;font-weight:800;letter-spacing:0.12em;color:#8b5cf6;text-transform:uppercase;">행사 정보</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8eaf0;border-radius:8px;overflow:hidden;margin-bottom:8px;">
              ${eventRows}
            </table>` : ""}
          </td>
        </tr>
        <tr><td style="padding:16px 40px 0;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
        ` : ""}

        <!-- 비용 내역 -->
        <tr>
          <td style="padding:24px 40px ${notesSection ? '8px' : '0'};">
            <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.12em;color:#8b5cf6;text-transform:uppercase;">비용 내역</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${billingRows}
              ${discountRow}
            </table>
          </td>
        </tr>

        <!-- 최종 금액 -->
        ${quoteTotal ? `
        <tr>
          <td style="padding:16px 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#2d1b69);border-radius:10px;padding:16px 22px;">
              <tr>
                <td style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:600;">최종 견적 금액</td>
                <td style="text-align:right;font-size:22px;font-weight:800;color:#fff;">${quoteTotal}</td>
              </tr>
            </table>
          </td>
        </tr>` : ""}

        ${notesSection}

        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 40px;text-align:center;">
            <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;">추가 문의사항은 아래 버튼을 눌러 연락해 주세요.<br>빠르게 답변 드리겠습니다.</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="mailto:fairpass@fairpass.world" style="display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#8b5cf6,#22d3ee);color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;">문의하기</a>
                </td>
                <td>
                  <a href="https://admin.fairpass.co.kr/Login" style="display:inline-block;padding:13px 28px;background:#1a1a2e;color:#fff;font-size:14px;font-weight:700;border-radius:8px;text-decoration:none;">시작하기 →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>

        <!-- 상세 안내 -->
        <tr>
          <td style="padding:24px 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#1a1a2e,#2d1b69);border-radius:10px;padding:16px 22px;">
                  <p style="margin:0;font-size:14px;font-weight:800;color:#fff;letter-spacing:0.03em;">📋 페어패스 등록시스템 도입 안내</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td style="padding:0 0 8px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">1. 페어패스 소개 및 강점</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">1) 관리자 페이지 ⇄ 무인 키오스크 연동 운영</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">사전 및 현장 등록 운영을 위한 관리자 페이지와 키오스크를 연동합니다. 행사 준비에 필요한 모든 프로세스(DB 업로드, 명찰 디자인, 키오스크 광고 등)를 관리자 페이지 안에서 처리할 수 있습니다.</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">2) 무분별한 종이 사용 방지 및 예산 절감</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">명찰 출력은 흰 용지에 디자인과 정보가 실시간 맵핑되어 출력됩니다. 사전에 카테고리별 명찰 용지를 별도 준비할 필요가 없으며, 행사 후 실제 발급된 수만큼만 정산 청구드립니다.</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">3) QR 코드로 10~14초 내 명찰 출력</p></td></tr>
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">행사 D-1 또는 당일 오전에 전체 참가자에게 입장 QR코드가 포함된 카카오톡 알림톡을 발송합니다. 참가자가 QR코드를 키오스크에 태깅하면 <strong>10~14초 내</strong>에 명찰이 출력됩니다.</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 6px;"><p style="margin:0;font-size:12px;font-weight:700;color:#7c3aed;">4) 예산 절감 효과</p></td></tr>
              <tr><td style="padding:4px 0 2px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">별도 등록 부스 설치 불필요 / 미사용 명찰 청구 없음 / 진행요원 인력 감소</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:4px 0 4px 8px;border-left:2px solid #e8e0ff;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">페어패스 키오스크 운영 현장 영상을 인스타그램에서 확인하실 수 있어요.</p></td></tr>
              <tr><td style="padding:8px 0 0 8px;"><a href="https://www.instagram.com/fairpass_official" style="font-size:12px;color:#7c3aed;font-weight:700;text-decoration:none;">📸 페어패스 인스타그램 →</a></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 10px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">2. 견적에서 변동 가능한 사항</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">목걸이줄 사양 및 브랜딩 여부</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">유료 결제 서비스 이용 시 수수료 발생 <span style="color:#888;">[총 결제금액의 국내 5% / 해외 8% 차감 후 정산]</span></p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">부가 서비스(출입관리·회의장 입퇴장 관리 등) 이용 시 추가 금액 발생</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #fde8a0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">현장 매니저 상주 유무에 따른 인건비</p></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr><td><hr style="border:none;border-top:1px solid #e8e8f0;margin:0;"></td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="padding:0 0 10px;"><p style="margin:0;font-size:13px;font-weight:800;color:#1a1a2e;">3. 기타 안내 사항</p></td></tr>
              <tr><td style="padding:3px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">별도 등록 시스템을 이미 운영 중인 경우 사전 등록자 명단 엑셀로 일괄 업로드 가능합니다. <span style="color:#7c3aed;font-weight:600;">이 경우 개인정보 제3자 동의에 페어패스 명시를 부탁드립니다.</span></p></td></tr>
              <tr><td style="padding:8px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">명찰 디자인은 ai 파일로 전달 부탁드리며, 저희가 진행 시 디자인 비용이 발생합니다.</p></td></tr>
              <tr><td style="padding:8px 0 3px 8px;border-left:2px solid #c7f3e0;"><p style="margin:0;font-size:12px;color:#444;line-height:1.8;">키오스크 설치 위치에 유선랜과 전기(70w/대) 준비를 부탁드립니다.</p></td></tr>
            </table>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="background:#f9f9fc;padding:20px 40px;border-top:1px solid #e8e8f0;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;color:#bbb;">본 메일은 발송 전용 메일로, 회신이 불가합니다. 문의: fairpass@fairpass.world</p>
            <p style="margin:0;font-size:12px;color:#aaa;">FAIRPASS · fairpass.co.kr</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error: resendErr } = await resend.emails.send({
    from: fromEmail,
    to: customerEmail,
    subject: `[FAIRPASS] ${name}님, 맞춤 견적서를 보내드립니다`,
    html,
  });

  if (resendErr) {
    console.error("Resend 발송 오류:", JSON.stringify(resendErr));
    return res.status(500).json({ error: "Email send failed", detail: resendErr.message });
  }

  // DB: quote_sent_at 업데이트
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );
    await supabase
      .from("inquiries")
      .update({ quote_sent_at: new Date().toISOString() })
      .eq("id", id);
  } catch (dbErr) {
    console.error("DB update error:", dbErr);
  }

  return res.status(200).json({ ok: true });
}
