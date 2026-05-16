export default async function handler(req, res) {
  try {
    const query = req.query.q || "태양광 재생에너지 REC SMP ESS";
    const period = req.query.period || "90";
    const debug = req.query.debug === "1";

    const normalizedQuery = normalizeQuery(query);

    const [naverNews, googleNews, globalNews] = await Promise.all([
      fetchNaverNews(normalizedQuery),
      fetchGoogleNews(normalizedQuery, period),
      fetchGlobalNews(normalizedQuery)
    ]);

    const articles = removeDuplicates([
      ...naverNews,
      ...googleNews,
      ...globalNews
    ])
      .filter(item => item.title && item.link)
      .sort((a, b) => {
        const da = new Date(a.pubDate).getTime() || 0;
        const db = new Date(b.pubDate).getTime() || 0;
        return db - da;
      })
      .slice(0, 120);

    const avgScore = articles.length
      ? Math.round(
          articles.reduce((sum, item) => sum + Number(item.score || 0), 0) /
            articles.length
        )
      : 0;

    return res.status(200).json({
      ok: true,
      query: normalizedQuery,
      period,
      count: articles.length,

      ...(debug
        ? {
            debug: {
              naverCount: naverNews.length,
              googleCount: googleNews.length,
              globalCount: globalNews.length,
              hasNaverId: Boolean(process.env.NAVER_CLIENT_ID),
              hasNaverSecret: Boolean(process.env.NAVER_CLIENT_SECRET)
            }
          }
        : {}),

      articles,

      signal: {
        mood:
          avgScore >= 78
            ? "시장 관심 확대"
            : avgScore >= 62
            ? "관심 증가"
            : "관망",

        avgScore,

        summary: articles.length
          ? "실시간 뉴스 데이터를 기반으로 산업 흐름을 분석했습니다."
          : "수집된 뉴스가 없습니다. 검색어 또는 외부 뉴스 상태를 확인해주세요."
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
}

/* ------------------------------------------------ */
/* normalize */
/* ------------------------------------------------ */

function normalizeQuery(query = "") {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clean(text = "") {
  let value = String(text || "");

  for (let i = 0; i < 3; i++) {
    value = value
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  return value
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<font\b[^>]*>(.*?)<\/font>/gi, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(xml, tag) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  );

  return match ? match[1].trim() : "";
}

/* ------------------------------------------------ */
/* query */
/* ------------------------------------------------ */

function expandQueries(query = "") {
  const raw = String(query || "").toLowerCase();

  if (/엔터|kpop|케이팝|하이브|jyp|yg|sm/.test(raw)) {
    return [
      "하이브",
      "SM엔터테인먼트",
      "JYP엔터",
      "YG엔터테인먼트",
      "K팝",
      "케이팝",
      "아이돌",
      "월드투어",
      "음원",
      "팬덤"
    ];
  }

  if (/반도체|hbm|파운드리|ai칩|삼성전자|하이닉스/.test(raw)) {
    return [
      "HBM",
      "AI 반도체",
      "삼성전자 반도체",
      "SK하이닉스",
      "파운드리",
      "엔비디아",
      "TSMC",
      "메모리 반도체"
    ];
  }

  if (/ai|인공지능|llm|openai|gpu/.test(raw)) {
    return [
      "생성형 AI",
      "LLM",
      "OpenAI",
      "Anthropic",
      "GPU",
      "AI 데이터센터",
      "인공지능"
    ];
  }

  if (/전기차|배터리|테슬라|자율주행/.test(raw)) {
    return [
      "전기차",
      "EV",
      "테슬라",
      "배터리",
      "자율주행",
      "로보택시",
      "현대차"
    ];
  }

  if (/태양광|재생에너지|solar|ess|smp|rec/.test(raw)) {
    return [
      "태양광",
      "재생에너지",
      "ESS",
      "REC",
      "SMP",
      "태양광 정책",
      "전력시장"
    ];
  }

  return [query];
}

function expandGlobalQueries(query = "") {
  const raw = String(query || "").toLowerCase();

  if (/엔터|kpop|케이팝|하이브|jyp|yg|sm/.test(raw)) {
    return [
      "K-pop",
      "HYBE",
      "BTS",
      "Blackpink",
      "SM Entertainment",
      "JYP Entertainment",
      "YG Entertainment",
      "Korean music industry"
    ];
  }

  if (/반도체|hbm|파운드리|ai칩|삼성전자|하이닉스/.test(raw)) {
    return [
      "semiconductor",
      "HBM",
      "AI chip",
      "NVIDIA",
      "TSMC",
      "Samsung Electronics",
      "SK Hynix"
    ];
  }

  if (/ai|인공지능|llm|openai|gpu/.test(raw)) {
    return [
      "artificial intelligence",
      "generative AI",
      "OpenAI",
      "Anthropic",
      "GPU",
      "AI agents"
    ];
  }

  if (/전기차|배터리|테슬라|자율주행/.test(raw)) {
    return [
      "electric vehicle",
      "Tesla",
      "EV battery",
      "autonomous driving",
      "robotaxi"
    ];
  }

  if (/태양광|재생에너지|solar|ess|smp|rec/.test(raw)) {
    return [
      "solar industry",
      "renewable energy",
      "photovoltaic",
      "energy storage",
      "solar supply chain"
    ];
  }

  return ["global industry"];
}

/* ------------------------------------------------ */
/* naver */
/* ------------------------------------------------ */

async function fetchNaverNews(query) {
  const NAVER_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_ID || !NAVER_SECRET) return [];

  const queries = expandQueries(query).slice(0, 10);

  const results = await Promise.all(
    queries.map(async q => {
      try {
        const url =
          "https://openapi.naver.com/v1/search/news.json?" +
          new URLSearchParams({
            query: q,
            display: "15",
            sort: "date"
          });

        const response = await fetch(url, {
          headers: {
            "X-Naver-Client-Id": NAVER_ID,
            "X-Naver-Client-Secret": NAVER_SECRET
          }
        });

        if (!response.ok) return [];

        const data = await response.json();

        return (data.items || []).map(item =>
          normalizeArticle({
            sourceType: "naver",
            source: "Naver",
            title: item.title,
            rawSummary: item.description,
            link: item.originallink || item.link,
            pubDate: item.pubDate
          })
        );
      } catch {
        return [];
      }
    })
  );

  return results.flat();
}

/* ------------------------------------------------ */
/* google korea */
/* ------------------------------------------------ */

async function fetchGoogleNews(query, period) {
  try {
    const queries = expandQueries(query).slice(0, 8);

    const results = await Promise.all(
      queries.map(q =>
        fetchGoogleRss({
          q:
            period && period !== "all"
              ? `${q} when:${period}d`
              : q,
          hl: "ko",
          gl: "KR",
          ceid: "KR:ko",
          sourceType: "google",
          fallbackSource: "Google News",
          limit: 10
        })
      )
    );

    return results.flat();
  } catch {
    return [];
  }
}

/* ------------------------------------------------ */
/* google global */
/* ------------------------------------------------ */

async function fetchGlobalNews(query) {
  try {
    const queries = expandGlobalQueries(query).slice(0, 8);

    const results = await Promise.all(
      queries.map(q =>
        fetchGoogleRss({
          q,
          hl: "en-US",
          gl: "US",
          ceid: "US:en",
          sourceType: "global",
          fallbackSource: "Global News",
          limit: 12
        })
      )
    );

    return removeDuplicates(results.flat())
      .filter(item => item.title && item.link)
      .sort((a, b) => {
        const da = new Date(a.pubDate).getTime() || 0;
        const db = new Date(b.pubDate).getTime() || 0;
        return db - da;
      })
      .slice(0, 35);
  } catch {
    return [];
  }
}

/* ------------------------------------------------ */
/* google rss */
/* ------------------------------------------------ */

async function fetchGoogleRss({
  q,
  hl,
  gl,
  ceid,
  sourceType,
  fallbackSource,
  limit
}) {
  try {
    const url =
      "https://news.google.com/rss/search?" +
      new URLSearchParams({
        q,
        hl,
        gl,
        ceid
      });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) return [];

    const xml = await response.text();

    if (!xml || !xml.includes("<item>")) {
      return [];
    }

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items.slice(0, limit).map(match => {
      const item = match[1];

      return normalizeArticle({
        sourceType,
        source: clean(getTag(item, "source")) || fallbackSource,
        title: getTag(item, "title"),
        rawSummary: getTag(item, "description"),
        link: getTag(item, "link"),
        pubDate: getTag(item, "pubDate")
      });
    });
  } catch {
    return [];
  }
}

/* ------------------------------------------------ */
/* article */
/* ------------------------------------------------ */

function normalizeArticle({
  sourceType,
  source,
  title,
  rawSummary,
  link,
  pubDate
}) {
  const cleanTitle = clean(title);
  const cleanSource = clean(source);
  const cleanSummary = clean(rawSummary);

  const text = `${cleanTitle} ${cleanSummary}`;

  return {
    sourceType,
    source: cleanSource,
    title: cleanTitle,
    rawSummary: cleanSummary,
    summary: makeReadableSummary(
      cleanSummary,
      cleanTitle,
      cleanSource
    ),
    link: clean(link),
    pubDate: clean(pubDate),
    category: detectCategory(text),
    score: makeScore(text),
    insight: makeInsight(text)
  };
}

/* ------------------------------------------------ */
/* summary */
/* ------------------------------------------------ */

function makeReadableSummary(
  description = "",
  title = "",
  source = ""
) {
  let text = clean(description || "");

  text = text
    .replace(title, "")
    .replace(source, "")
    .replace(/[-–—|·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 25) {
    text = clean(title || "");
  }

  const sentences = text
    .split(/(?<=[.!?。！？])\s+|(?<=다\.)\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  let summary = sentences.slice(0, 2).join(" ");

  if (!summary || summary.length < 25) {
    summary = text;
  }

  if (summary.length > 220) {
    summary = summary.slice(0, 220) + "...";
  }

  return summary || "기사 내용을 확인해 산업 흐름을 참고하세요.";
}

/* ------------------------------------------------ */
/* insight */
/* ------------------------------------------------ */

function detectCategory(text = "") {
  const value = String(text).toLowerCase();

  if (
    /정책|정부|규제|보조금|policy|regulation|subsidy/.test(value)
  ) {
    return "정책";
  }

  if (
    /시장|투자|실적|market|investment|earnings|stock/.test(value)
  ) {
    return "시장";
  }

  if (
    /기술|ai|gpu|chip|battery|technology/.test(value)
  ) {
    return "기술";
  }

  if (
    /리스크|논란|소송|risk|lawsuit|controversy/.test(value)
  ) {
    return "리스크";
  }

  return "일반";
}

function makeScore(text = "") {
  const value = String(text).toLowerCase();

  let score = 45;

  if (/ai|solar|battery|kpop|semiconductor/.test(value)) {
    score += 10;
  }

  if (/policy|investment|market|earnings/.test(value)) {
    score += 12;
  }

  if (/risk|lawsuit|supply chain/.test(value)) {
    score += 8;
  }

  return Math.min(score, 98);
}

function makeInsight(text = "") {
  const value = String(text).toLowerCase();

  if (/risk|lawsuit|controversy/.test(value)) {
    return "리스크 이슈가 감지됩니다.";
  }

  if (/policy|subsidy|regulation/.test(value)) {
    return "정책 변화 가능성을 함께 확인할 필요가 있습니다.";
  }

  if (/market|investment|earnings/.test(value)) {
    return "시장 흐름과 수급 변화 확인이 필요합니다.";
  }

  if (/technology|ai|battery|chip/.test(value)) {
    return "기술 변화가 산업 흐름에 영향을 줄 수 있습니다.";
  }

  return "시장 흐름 참고용 기사입니다.";
}

/* ------------------------------------------------ */
/* dedupe */
/* ------------------------------------------------ */

function removeDuplicates(items) {
  const seen = new Set();

  return items.filter(item => {
    const titleKey = clean(item.title || "")
      .toLowerCase()
      .replace(/\s+/g, " ");

    const linkKey = clean(item.link || "")
      .toLowerCase()
      .split("?")[0];

    const key = titleKey || linkKey;

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}
