export default async function handler(req, res) {
  try {
    const query = req.query.q || "태양광 OR 재생에너지 OR REC OR SMP OR ESS";
    const period = req.query.period || "30";

    const [naverNews, googleNews, globalNews] = await Promise.all([
      fetchNaverNews(query),
      fetchGoogleNews(query, period),
      fetchGlobalSolarNews(period)
    ]);

    const articles = removeDuplicates([
      ...naverNews,
      ...googleNews,
      ...globalNews
    ])
      .sort((a, b) => {
        const da = new Date(a.pubDate).getTime() || 0;
        const db = new Date(b.pubDate).getTime() || 0;
        return db - da;
      })
      .slice(0, 100);

    const avgScore = articles.length
      ? Math.round(
          articles.reduce((sum, item) => sum + Number(item.score || 0), 0) /
            articles.length
        )
      : 0;

    return res.status(200).json({
      ok: true,
      query,
      period,
      count: articles.length,
      naverCount: naverNews.length,
      googleCount: googleNews.length,
      globalCount: globalNews.length,
      articles,
      signal: {
        mood:
          avgScore >= 75
            ? "시장 관심 확대"
            : avgScore >= 60
            ? "관심 증가"
            : "관망",
        avgScore,
        summary: "뉴스 데이터를 기반으로 태양광 산업 흐름을 분석했습니다."
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
}

async function fetchNaverNews(query) {
  const NAVER_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_ID || !NAVER_SECRET) {
    return [];
  }

  try {
    const url =
      "https://openapi.naver.com/v1/search/news.json?" +
      new URLSearchParams({
        query,
        display: "50",
        sort: "date"
      });

    const response = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": NAVER_ID,
        "X-Naver-Client-Secret": NAVER_SECRET
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return (data.items || []).map(item => {
      const title = clean(item.title);
      const summary = clean(item.description);
      const text = `${title} ${summary}`;

      return {
        sourceType: "naver",
        source: "Naver",
        title,
        summary,
        link: item.originallink || item.link,
        pubDate: item.pubDate,
        category: detectCategory(text),
        score: makeScore(text),
        insight: makeInsight(text)
      };
    });
  } catch (error) {
    return [];
  }
}

async function fetchGoogleNews(query, period) {
  try {
    const periodQuery =
      period && period !== "all"
        ? `${query} when:${period}d`
        : query;

    const url =
      "https://news.google.com/rss/search?" +
      new URLSearchParams({
        q: periodQuery,
        hl: "ko",
        gl: "KR",
        ceid: "KR:ko"
      });

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items.slice(0, 50).map(match => {
      const item = match[1];

      const title = clean(getTag(item, "title"));
      const source = clean(getTag(item, "source")) || "Google News";
      const rawDescription = getTag(item, "description");
      const summary = makeReadableSummary(rawDescription, title, source);
      const link = clean(getTag(item, "link"));
      const pubDate = clean(getTag(item, "pubDate"));
      const text = `${title} ${summary}`;

      return {
        sourceType: "google",
        source,
        title,
        summary,
        link,
        pubDate,
        category: detectCategory(text),
        score: makeScore(text),
        insight: makeInsight(text)
      };
    });
  } catch (error) {
    return [];
  }
}

async function fetchGlobalSolarNews(period) {
  try {
    const query =
      period && period !== "all"
        ? `solar industry OR photovoltaic OR energy storage when:${period}d`
        : "solar industry OR photovoltaic OR energy storage";

    const url =
      "https://news.google.com/rss/search?" +
      new URLSearchParams({
        q: query,
        hl: "en-US",
        gl: "US",
        ceid: "US:en"
      });

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items.slice(0, 30).map(match => {
      const item = match[1];

      const title = clean(getTag(item, "title"));
      const source = clean(getTag(item, "source")) || "Global News";
      const rawDescription = getTag(item, "description");
      const summary = makeReadableSummary(rawDescription, title, source);
      const link = clean(getTag(item, "link"));
      const pubDate = clean(getTag(item, "pubDate"));
      const text = `${title} ${summary}`;

      return {
        sourceType: "global",
        source,
        title,
        summary,
        link,
        pubDate,
        category: detectCategory(text),
        score: makeScore(text),
        insight: makeInsight(text)
      };
    });
  } catch (error) {
    return [];
  }
}

function getTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
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
    .replace(/<font\b[^>]*>(.*?)<\/font>/gi, " $1")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeReadableSummary(description = "", title = "", source = "") {
  let text = clean(description);

  if (title) {
    text = text.replace(title, "").trim();
  }

  if (source) {
    text = text.replace(source, "").trim();
  }

  text = text
    .replace(/^[-–—·|:]+/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 140) {
    text = text.slice(0, 140) + "...";
  }

  return text || "요약 정보가 없습니다.";
}

function detectCategory(text = "") {
  const value = String(text).toLowerCase();

  if (/정책|산업부|보조금|지원사업|rps|규제|고시|정부|policy|subsidy|ira|tax credit/.test(value)) {
    return "정책";
  }

  if (/rec|smp|전력시장|가격|수익|전력거래|market|price|investment|finance/.test(value)) {
    return "시장";
  }

  if (/ess|배터리|인버터|모듈|효율|저장|battery|storage|module|inverter|technology/.test(value)) {
    return "기술";
  }

  if (/계통|지연|화재|고장|민원|리스크|안전|grid|delay|fire|risk|safety|curtailment/.test(value)) {
    return "리스크";
  }

  return "일반";
}

function makeScore(text = "") {
  const value = String(text).toLowerCase();
  let score = 45;

  if (/태양광|solar|photovoltaic|pv/.test(value)) score += 8;
  if (/정책|산업부|보조금|policy|subsidy|ira/.test(value)) score += 12;
  if (/rec|smp|수익|전력시장|market|price/.test(value)) score += 12;
  if (/ess|배터리|저장|battery|storage/.test(value)) score += 10;
  if (/계통|리스크|화재|grid|risk|curtailment/.test(value)) score += 12;

  return Math.min(score, 98);
}

function makeInsight(text = "") {
  const value = String(text).toLowerCase();

  if (/계통|접속|지연|grid|curtailment/.test(value)) {
    return "계통 접속 가능성과 사업 일정 리스크를 함께 점검해야 합니다.";
  }

  if (/rec|smp|가격|수익|market|price/.test(value)) {
    return "수익성 변동 가능성이 있어 REC/SMP 흐름과 계약 조건 확인이 필요합니다.";
  }

  if (/ess|배터리|저장|battery|storage/.test(value)) {
    return "ESS 연계 사업 또는 전력 안정화 제안 포인트로 활용할 수 있습니다.";
  }

  if (/정책|산업부|보조금|policy|subsidy|ira/.test(value)) {
    return "정책 변화가 수주, 투자, 제안서 방향에 영향을 줄 수 있습니다.";
  }

  if (/화재|고장|안전|risk|fire|safety/.test(value)) {
    return "안전관리, 유지보수, 사후관리 체계 점검이 필요합니다.";
  }

  return "시장 흐름 참고용 기사입니다. 관련 키워드의 반복 여부를 확인하세요.";
}

function removeDuplicates(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = clean(item.title || item.link || "").toLowerCase();

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}