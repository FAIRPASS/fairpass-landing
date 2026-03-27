import { BetaAnalyticsDataClient } from "@google-analytics/data";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { password } = req.query;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sa = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf8")
    );
    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: sa.client_email,
        private_key: sa.private_key,
      },
    });

    const propertyId = process.env.GA4_PROPERTY_ID;

    const [overviewRes, sourceRes, countryRes, eventRes, pageRes] = await Promise.all([
      // 기간별 방문자 수
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          { startDate: "today", endDate: "today" },
          { startDate: "7daysAgo", endDate: "today" },
          { startDate: "30daysAgo", endDate: "today" },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
      }),
      // 유입 경로
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
      // 국가별
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 5,
      }),
      // 커스텀 이벤트
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: ["quote_start", "quote_email_click", "quote_submit", "brochure_open", "brochure_submit", "cta_signup_click"],
            },
          },
        },
      }),
      // 페이지별
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 6,
      }),
    ]);

    // 기간별 파싱
    const overview = {};
    const labels = ["today", "7days", "30days"];
    overviewRes[0].rows?.forEach((row, i) => {
      overview[labels[i]] = {
        users: row.metricValues[0].value,
        sessions: row.metricValues[1].value,
        pageviews: row.metricValues[2].value,
      };
    });

    // 유입 경로 파싱
    const sources = sourceRes[0].rows?.map(row => ({
      channel: row.dimensionValues[0].value,
      sessions: row.metricValues[0].value,
    })) || [];

    // 국가 파싱
    const countries = countryRes[0].rows?.map(row => ({
      country: row.dimensionValues[0].value,
      users: row.metricValues[0].value,
    })) || [];

    // 이벤트 파싱
    const events = {};
    eventRes[0].rows?.forEach(row => {
      events[row.dimensionValues[0].value] = row.metricValues[0].value;
    });

    // 페이지 파싱
    const pages = pageRes[0].rows?.map(row => ({
      path: row.dimensionValues[0].value,
      views: row.metricValues[0].value,
    })) || [];

    return res.status(200).json({ overview, sources, countries, events, pages });
  } catch (e) {
    console.error("GA4 API error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
