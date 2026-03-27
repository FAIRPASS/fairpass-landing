// =============================================
// FAIRPASS — Portfolio Image Upload API
// 이미지를 base64로 받아 Supabase Storage에 업로드
// Vercel body limit: 4.5MB → 원본 파일 ~3MB 이하 권장
// =============================================
// [얼굴 블러] 저장 전 자동 얼굴 감지 + 가우시안 블러 처리
//   - 얼굴 좌표: Google Cloud Vision API (faceAnnotations)
//   - 블러 처리: sharp
//   - Vision API 실패 시 원본 그대로 저장 (안전 fallback)
//
// [환경변수 설정]
//   GOOGLE_VISION_API_KEY=발급받은_API_키
//
//   로컬 개발: .env.local 에 추가
//   Vercel 배포: Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
//
// [Google Vision API 키 발급]
//   1. https://console.cloud.google.com 접속
//   2. 프로젝트 선택 (또는 새 프로젝트 생성)
//   3. APIs & Services → Enable APIs → "Cloud Vision API" 활성화
//   4. APIs & Services → Credentials → "+ CREATE CREDENTIALS" → API key
//   5. 생성된 키를 GOOGLE_VISION_API_KEY 환경변수에 설정
// =============================================

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

// ── Google Cloud Vision API로 얼굴 좌표 조회 ─────────────────────────────
async function detectFaces(imageBuffer) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_VISION_API_KEY 환경변수가 설정되지 않음");

  const body = JSON.stringify({
    requests: [{
      image: { content: imageBuffer.toString("base64") },
      features: [{ type: "FACE_DETECTION", maxResults: 20 }],
    }],
  });

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vision API 오류 ${res.status}: ${text}`);
  }

  const json = await res.json();
  return json.responses?.[0]?.faceAnnotations ?? [];
}

// ── 얼굴 블러 처리 ────────────────────────────────────────────────────────
async function applyFaceBlur(imageBuffer) {
  try {
    const faces = await detectFaces(imageBuffer);

    // 얼굴 없음 → 원본 반환
    if (faces.length === 0) {
      return { buffer: imageBuffer, facesBlurred: 0 };
    }

    const { width, height } = await sharp(imageBuffer).metadata();
    const composites = [];

    for (const face of faces) {
      // Vision API는 fdBoundingPoly(정밀) 또는 boundingPoly(여백 포함) 제공
      // fdBoundingPoly: 실제 얼굴 영역에 더 밀착된 좌표
      const poly = face.fdBoundingPoly ?? face.boundingPoly;
      if (!poly?.vertices?.length) continue;

      const xs = poly.vertices.map((v) => v.x ?? 0);
      const ys = poly.vertices.map((v) => v.y ?? 0);
      const x1 = Math.min(...xs);
      const y1 = Math.min(...ys);
      const x2 = Math.max(...xs);
      const y2 = Math.max(...ys);
      const fw = x2 - x1;
      const fh = y2 - y1;

      // 얼굴 박스에 15% 여백 추가
      const pad = 0.15;
      const left = Math.max(0, Math.floor(x1 - fw * pad));
      const top  = Math.max(0, Math.floor(y1 - fh * pad));
      const w    = Math.min(width  - left, Math.ceil(fw * (1 + 2 * pad)));
      const h    = Math.min(height - top,  Math.ceil(fh * (1 + 2 * pad)));

      if (w <= 0 || h <= 0) continue;

      // 얼굴 영역만 추출 → 가우시안 블러(sigma=20) → 원형 마스크 적용 → 오버레이용 버퍼
      const blurredRect = await sharp(imageBuffer)
        .extract({ left, top, width: w, height: h })
        .blur(20)
        .png()
        .toBuffer();

      const circleMask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
        `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}"/>` +
        `</svg>`
      );

      const blurredFace = await sharp(blurredRect)
        .composite([{ input: circleMask, blend: 'dest-in' }])
        .png()
        .toBuffer();

      composites.push({ input: blurredFace, left, top });
    }

    if (composites.length === 0) {
      return { buffer: imageBuffer, facesBlurred: 0 };
    }

    // 원본 이미지 위에 블러된 얼굴 영역 합성
    const output = await sharp(imageBuffer).composite(composites).toBuffer();
    return { buffer: output, facesBlurred: composites.length };

  } catch (err) {
    console.error("[face-blur] error:", err.message);
    return { buffer: imageBuffer, facesBlurred: -1, blurError: err.message };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { password, fileData, fileName, mimeType } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!fileData || !fileName) {
    return res.status(400).json({ error: "Missing file data" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  // base64 → Buffer
  const rawBuffer = Buffer.from(fileData, "base64");

  // 얼굴 감지 + 블러 처리 (실패 시 원본 사용)
  const { buffer, facesBlurred, blurError } = await applyFaceBlur(rawBuffer);

  const ext = fileName.split(".").pop().toLowerCase() || "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("portfolio")
    .upload(uniqueName, buffer, { contentType: mimeType || "image/jpeg", upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = supabase.storage
    .from("portfolio")
    .getPublicUrl(uniqueName);

  return res.status(200).json({ url: publicUrl, facesBlurred, blurError: blurError || null });
}
