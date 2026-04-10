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

## 인프라 (2026-04-10 업데이트)
- **GitHub (Vercel 연결)**: github.com/FAIRPASS/fairpass-landing — 개인 계정, Vercel이 바라보는 레포
- **GitHub (로컬 작업)**: github.com/blueorigin2021/fairpass-landing — 회사 계정
- **git push 설정**: `git push origin main` 한 번에 두 레포 동시 push됨
  - origin push → blueorigin2021/fairpass-landing + FAIRPASS/fairpass-landing 동시
  - Vercel이 FAIRPASS 변경 감지 → 자동 배포
- Vercel: FAIRPASS 개인 GitHub 연동 (push → 자동 배포) — 추후 blueorigin2021로 이전 예정
- Supabase: blueorigin2021's Org 소유 (포트폴리오 DB + 이미지 Storage)
  - 프로젝트 ID: `ztqxwbagbqenrcvjrkrh`
  - SQL Editor: https://supabase.com/dashboard/project/ztqxwbagbqenrcvjrkrh/sql/new
- 비용 청구: Supabase는 회사 계정(blueorigin2021) 카드로 청구됨

### ⚠️ GITHUB_OWNER 환경변수 (Vercel에 설정 필요)
- `GITHUB_OWNER` = `FAIRPASS` — journal-admin.js가 저널 포스트 저장할 레포 오너
- 미설정 시 기본값 `FAIRPASS` 사용 (현재 정상 작동)

## 보안 현황 (2026-04-02 업데이트)
- `quote-email.js` — CORS + Honeypot + Turnstile + **IP Rate Limit(10분/3회) + 5초 속도 차단** ✅
- `brochure-email.js` — CORS + Honeypot + Turnstile + **IP Rate Limit(10분/3회) + 5초 속도 차단** ✅
- `en-waitlist.js` — CORS + Honeypot + Turnstile + **IP Rate Limit** ✅
- `inquiries.js` — Admin 비밀번호 인증 ✅
- Supabase `inquiries` 테이블에 `ip` 컬럼 추가됨 (Rate Limiting용)

## 모의견적 → 견적 요청 시스템 개편 (2026-04-08)
- **배경**: 경제 침체로 가격 표시 후 이탈 증가 → 가격 숨기고 상담 전환 방식으로 변경
- **변경 파일**: `index.html`, `js/main.js`, `api/quote-email.js`, `api/quote-send.js`(신규), `admin/index.html`, `css/style.css`
- **핵심 변경**:
  - `index.html`: 가격 표시(`sumTotal`, `sumItems`) 제거 → 안내 노트로 교체 / 전화번호 필드(필수) 추가 / 버튼 "견적 요청하기"로 변경 / 성공 메시지 업데이트
  - `api/quote-email.js`: 고객 자동 이메일 발송 제거 / 내부 알림만 유지 (yj@fairpass.world + fairpass@fairpass.world) / phone 필드 추가
  - `api/quote-send.js`: 관리자 수동 견적 발송 API / 인증: ADMIN_PASSWORD / 고객에게 맞춤 견적 이메일 + FAIRPASS 상세 안내 발송 / DB `quote_sent_at` 업데이트
  - `admin/index.html`: 전화번호 컬럼 추가 / "견적 발송" 버튼 → 클릭 시 모달 (고객 정보 + 견적 내용 편집 + 금액 입력) / 발송 후 "✓ 발송완료" 배지 즉시 표시
- **Supabase**: `inquiries` 테이블에 `phone TEXT` + `quote_sent_at TIMESTAMPTZ` 컬럼 추가 완료
- **운영 플로우**: 고객 폼 제출 → 내부 알림 수신 → 관리자 페이지 "견적 발송" 클릭 → 고객에게 맞춤 견적서 이메일 발송 → 전화 상담

## 모바일 반응형 전체 개편 (2026-04-07~08)
- **대상**: index.html, kiosk.html, badge.html, css/style.css
- **주요 수정**: 전체 grid 1열 override (@media 768px/480px) / white-space:nowrap 인라인 스타일 !important 해제 / 히어로 텍스트 마케팅 문구 재작성 / 모바일 nav 정렬 수정 (align-items: stretch) / store-cta 배너 모바일 세로 배치 + 네이버 그린 accent
- **CSS 추가**: `.quote-request-note`, `.store-cta` 모바일 재설계, SUB-PAGE MOBILE GRID OVERRIDES 블록

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

## ✅ 작업 완료 전 자가 검토 프로세스 (필수)

> 완료 보고 전에 반드시 아래 순서를 따를 것. 사용자에게 먼저 말하지 말 것.

### 검토 절차 (2-Pass 자동 검토)

**1차 검토** — 작업 직후 수행:
- 수정한 파일을 직접 다시 읽고 오류 확인
- CSS: 모바일 미디어쿼리 override 누락 여부, 오타, 괄호 미닫힘
- HTML: 태그 미닫힘, 인라인 스타일 충돌, 클래스명 오타
- JS: 문법 오류, 참조 오류, 기존 함수 영향 여부
- 문제 발견 시 즉시 수정 후 2차 검토 진행

**2차 검토** — 1차 통과 후 수행:
- 수정 의도와 실제 코드가 일치하는지 재확인
- 연관 파일에 영향이 없는지 확인 (예: CSS 변경 → 다른 페이지 영향)
- PC 버전 스타일이 건드려지지 않았는지 확인 (모바일 작업 시)
- 2차도 통과 시 → 배포 후 완료 보고

### 완료 보고 형식
```
배포 완료.

[작업 내용]
- 파일명: 변경 요약
- 파일명: 변경 요약

[검토 결과] 2-Pass 이상 없음
```

### 확인 없이 바로 진행하는 것들
- CSS 수정 (보안/과금/삭제 아닌 것)
- HTML 텍스트/구조 수정
- 배포 (git push)
- 모바일 반응형 수정
- 문구 다듬기

### 반드시 확인하는 것들 (크리티컬)
- 보안 관련 변경 (인증, 권한, API 키)
- 과금 발생 가능한 외부 서비스 연동
- 파일/DB/데이터 영구 삭제
