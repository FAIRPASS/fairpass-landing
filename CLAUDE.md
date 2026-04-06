# FAIRPASS 랜딩페이지 개발 규칙

## 배포 (2026-04-02 업데이트)
- 수정 후 반드시 즉시 배포
- URL: https://fairpass.world
- **표준 배포 방법: git push → Vercel 자동 배포**
  ```
  git add <파일>
  git commit -m "설명"
  git push origin main
  ```
  → Vercel이 GitHub push 감지 후 자동 배포 (1~2분)

### ⚠️ vercel login 불가 이슈 (컴퓨터 이름 한글 포함 버그)
- `vercel login` 실행 시 `TypeError: 리빛 @ vercel ... is not a legal HTTP header value` 오류 발생
- **대안: 토큰 방식** (git push 불가한 긴급 상황에서만)
  1. https://vercel.com/account/tokens 에서 토큰 발급
  2. `npx vercel --prod --token <발급받은토큰>`
  3. 사용 후 토큰 삭제 권장

## 인프라 (2026-03-30 회사 계정으로 이전 완료)
- GitHub: github.com/FAIRPASS/fairpass-landing (FAIRPASS 조직, public)
- Vercel: FAIRPASS 조직 GitHub 연동 (push → 자동 배포)
- Supabase: blueorigin2021's Org 소유 (포트폴리오 DB + 이미지 Storage)
  - 프로젝트 ID: `ztqxwbagbqenrcvjrkrh`
  - SQL Editor: https://supabase.com/dashboard/project/ztqxwbagbqenrcvjrkrh/sql/new
- 비용 청구: Supabase는 회사 계정(blueorigin2021) 카드로 청구됨

## 보안 현황 (2026-04-02 업데이트)
- `quote-email.js` — CORS + Honeypot + Turnstile + **IP Rate Limit(10분/3회) + 5초 속도 차단** ✅
- `brochure-email.js` — CORS + Honeypot + Turnstile + **IP Rate Limit(10분/3회) + 5초 속도 차단** ✅
- `en-waitlist.js` — CORS + Honeypot + Turnstile + **IP Rate Limit** ✅
- `inquiries.js` — Admin 비밀번호 인증 ✅
- Supabase `inquiries` 테이블에 `ip` 컬럼 추가됨 (Rate Limiting용)

## FAQ 페이지 (2026-04-02 추가)
- `faq.html` — 8개 카테고리, 32개 Q&A, 국영문 전환, 아코디언 UI
- 카테고리: 서비스 소개 / 기능-운영 / 명찰 / 가격-견적 / 보안-데이터 / ESG-친환경 / 글로벌-해외(KO only) / 상담-도입
- FAQPage JSON-LD 스키마 포함 (AEO 대응)
- 원본 데이터: `FAIRPASS_FAQ_국영문_최종.xlsx`
- 전체 nav에 FAQ 링크 추가됨 (index, platform, kiosk, badge, portfolio)
- sitemap.xml에 추가됨

## 영상 언어 전환 (2026-04-02 업데이트)
- `kiosk.html` 중간 영상: KO → `Kiosk KR_NEW.mp4` / EN → `Kiosk_EN.mp4`
- 언어 전환 시 `js/main.js`의 `setLang()` 함수에서 `video.lang-video` 클래스 대상으로 src 자동 교체
- video 태그에 `data-src-ko` / `data-src-en` 속성으로 소스 지정

## Journal (구 Blog) — 2026-04-06 업데이트
- 명칭: "FAIRPASS Journal" (이전: FAIRPASS Blog)
- URL: `/journal/` (이전: `/blog/`)
- Astro 소스: `blog-src/` (base: `/journal`, outDir: `../journal`)
- 콘텐츠 컬렉션: `journal-ko` / `journal-en` (이전: `blog-ko` / `blog-en`)
- 관리자 페이지: `/admin/journal.html` (이전: `/admin/blog.html`)
- API: `/api/journal-admin` (이전: `/api/blog-admin`)
- SNS 생성: `/api/journal-sns` (Claude API 연동)
- 영문 번역: `/api/journal-translate` (Claude API 연동)
- GitHub Actions: `.github/workflows/journal-draft.yml` (화/목 주 2회 자동 초안)
- 카테고리 6개: FAIRPASS 이야기/Our Story, FAIRPASS 활용법/How It Works, 운영 사례/In the Field, 지속가능한 행사/Sustainable Events, 업계 트렌드/Industry Trends, FAIRPASS 소식/FAIRPASS News
- Status 4단계: draft → review → approved → published
- 빌드: `blog-src/` 에서 `npm run build` → `journal/` 폴더 출력 → git push → Vercel 자동 배포

## 필수 규칙
- 사용자가 요청한 것만 수정할 것
- 실행 여부를 묻지 말고 바로 수행할 것
