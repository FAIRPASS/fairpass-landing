# FAIRPASS 랜딩페이지 개발 규칙

## 배포
- 수정 후 반드시 즉시 배포
- URL: https://fairpass.world

### ⚠️ vercel login 불가 이슈 (컴퓨터 이름 한글 포함 버그)
- `vercel login` 실행 시 `TypeError: 리빛 @ vercel ... is not a legal HTTP header value` 오류 발생
- **해결: 토큰 방식으로 배포**
  1. https://vercel.com/account/tokens 에서 토큰 발급
  2. `npx vercel --prod --token <발급받은토큰>`
  3. 배포 완료 후 토큰 즉시 삭제 (보안)

## 인프라 (2026-03-30 회사 계정으로 이전 완료)
- GitHub: github.com/FAIRPASS/fairpass-landing (FAIRPASS 조직, public)
- Vercel: FAIRPASS 조직 GitHub 연동
- Supabase: blueorigin2021's Org 소유 (포트폴리오 DB + 이미지 Storage)
- 비용 청구: Supabase는 회사 계정(blueorigin2021) 카드로 청구됨

## 보안 현황 (2026-04-02 업데이트)
- `quote-email.js` — CORS 화이트리스트 + Honeypot + Turnstile ✅
- `brochure-email.js` — CORS 화이트리스트 + Honeypot + Turnstile ✅
- `en-waitlist.js` — CORS 화이트리스트 + Honeypot + Turnstile ✅ (오늘 추가)
- `inquiries.js` — Admin 비밀번호 인증 ✅

## 영상 언어 전환 (2026-04-02 업데이트)
- `kiosk.html` 중간 영상: KO → `Kiosk KR_NEW.mp4` / EN → `Kiosk_EN.mp4`
- 언어 전환 시 `js/main.js`의 `setLang()` 함수에서 `video.lang-video` 클래스 대상으로 src 자동 교체
- video 태그에 `data-src-ko` / `data-src-en` 속성으로 소스 지정

## 필수 규칙
- 사용자가 요청한 것만 수정할 것
- 실행 여부를 묻지 말고 바로 수행할 것
