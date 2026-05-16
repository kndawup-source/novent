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
          avgScore >= 75
            ? "시장 관심 확대"
            : avgScore >= 60
            ? "관심 증가"
            : "관망",
        avgScore,
        summary: articles.length
          ? "뉴스 데이터를 기반으로 산업 흐름을 분석했습니다."
          : "수집된 뉴스가 없습니다. 검색어 또는 외부 뉴스 호출 상태를 확인해주세요."
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
}

function normalizeQuery(query = "") {
  return String(query || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSpaceQuery(query = "") {
  return String(query || "")
    .replace(/\bOR\b/gi, " ")
    .replace(/[()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandQueries(query = "") {
  const raw = String(query || "").trim();
  const low = raw.toLowerCase();

  if (/엔터|kpop|케이팝|k팝|하이브|에스엠|jyp|yg|음원|콘서트|팬덤/.test(low)) {
    return [
      "하이브",
      "에스엠",
      "SM엔터테인먼트",
      "JYP엔터",
      "YG엔터테인먼트",
      "케이팝",
      "K팝",
      "엔터테인먼트",
      "콘서트",
      "음원",
      "팬덤",
      "월드투어"
    ];
  }

  if (/반도체|hbm|ai칩|파운드리|메모리|삼성전자|하이닉스/.test(low)) {
    return [
      "HBM",
      "AI 반도체",
      "엔비디아",
      "파운드리",
      "삼성전자 반도체",
      "SK하이닉스",
      "메모리 반도체",
      "TSMC",
      "반도체 수출규제",
      "반도체 장비"
    ];
  }

  if (/ai|인공지능|llm|생성형|openai|anthropic|gpu/.test(low)) {
    return [
      "생성형 AI",
      "LLM",
      "OpenAI",
      "Anthropic",
      "GPU",
      "AI 에이전트",
      "인공지능",
      "AI 데이터센터",
      "AI 규제"
    ];
  }

  if (/전기차|배터리|자율주행|로보택시|테슬라|현대차|mobility/.test(low)) {
    return [
      "전기차",
      "테슬라",
      "현대차",
      "자율주행",
      "로보택시",
      "배터리",
      "EV",
      "충전 인프라",
      "전기차 보조금"
    ];
  }

  if (/태양광|재생에너지|rec|smp|ess|solar/.test(low)) {
    return [
      "태양광",
      "재생에너지",
      "REC",
      "SMP",
      "ESS",
      "전력시장",
      "태양광 정책",
      "계통 접속",
      "태양광 화재"
    ];
  }

  return raw
    .split(/\s+OR\s+|\s*\|\s*/i)
    .map(v => v.replace(/[()"]/g, "").trim())
    .filter(Boolean);
}

function expandGlobalQueries(query = "") {
  const raw = String(query || "").toLowerCase();

  if (/엔터|kpop|케이팝|k팝|하이브|에스엠|음원|콘서트|팬덤|sm|yg|jyp/.test(raw)) {
    return [
      "kpop",
      "HYBE",
      "SM Entertainment",
      "JYP Entertainment",
      "YG Entertainment",
      "Korean entertainment",
      "concert tour",
      "music streaming"
    ];
  }

  if (/반도체|hbm|ai칩|파운드리|메모리|삼성전자|하이닉스/.test(raw)) {
    return [
      "semiconductor",
      "HBM",
      "AI chip",
      "NVIDIA",
      "TSMC",
      "Samsung Electronics",
      "SK Hynix",
      "memory chip"
    ];
  }

  if (/ai|인공지능|llm|생성형|openai|anthropic|gpu/.test(raw)) {
    return [
      "artificial intelligence",
      "generative AI",
      "OpenAI",
      "Anthropic",
      "AI agents",
      "GPU",
      "data center"
    ];
  }

  if (/전기차|배터리|자율주행|로보택시|테슬라|현대차|mobility/.test(raw)) {
    return [
      "electric vehicle",
      "Tesla",
      "EV battery",
      "autonomous driving",
      "robotaxi",
      "mobility industry"
    ];
  }

  if (/태양광|재생에너지|rec|smp|ess|solar/.test(raw)) {
    return [
      "solar industry",
      "photovoltaic",
      "renewable energy",
      "energy storage",
      "solar supply chain"
    ];
  }

  return ["global industry"];
}

function toGoogleOrQuery(query = "") {
  const parts = expandQueries(query).slice(0, 8);

  if (parts.length <= 1) {
    return toSpaceQuery(query) || "산업 뉴스";
  }

  return parts.map(item => `"${item}"`).join(" OR ");
}

async function fetchNaverNews(query) {
  const NAVER_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_ID || !NAVER_SECRET) return [];

  const queries = expandQueries(query).slice(0, 12);

  const results = await Promise.all(
    queries.map(async q => {
      try {
        const url =
          "https://openapi.naver.com/v1/search/news.json?" +
          new URLSearchParams({
            query: q,
            display: "20",
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

        return (data.items || []).map(item => normalizeArticle({
          sourceType: "naver",
          source: "Naver",
          title: item.title,
          rawSummary: item.description,
          link: item.originallink || item.link,
          pubDate: item.pubDate
        }));
      } catch {
        return [];
      }
    })
  );

  return results.flat();
}

async function fetchGoogleNews(query, period) {
  try {
    const googleQuery = toGoogleOrQuery(query);

    const periodQuery =
      period && period !== "all"
        ? `${googleQuery} when:${period}d`
        : googleQuery;

    return await fetchGoogleRss({
      q: periodQuery,
      hl: "ko",
      gl: "KR",
      ceid: "KR:ko",
      sourceType: "google",
      fallbackSource: "Google News",
      limit: 50
    });
  } catch {
    return [];
  }
}

async function fetchGlobalNews(query) {
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
        limit: 10
      })
    )
  );

  return results.flat();
}

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
    if (!xml || !xml.includes("<item>")) return [];

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
    summary: makeReadableSummary(cleanSummary, cleanTitle, cleanSource),
    link: clean(link),
    pubDate: clean(pubDate),
    category: detectCategory(text),
    score: makeScore(text),
    insight: makeInsight(text)
  };
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

function detectCategory(text = "") {
  const value = String(text).toLowerCase();

  if (/정책|정부|규제|법안|산업부|보조금|지원사업|rps|고시|policy|subsidy|regulation|tax credit|ira/.test(value)) {
    return "정책";
  }

  if (/시장|가격|수익|매출|실적|투자|주가|전력시장|rec|smp|market|price|revenue|earnings|investment|finance|stock/.test(value)) {
    return "시장";
  }

  if (/기술|ai|hbm|gpu|반도체|배터리|ess|인버터|모듈|플랫폼|streaming|technology|battery|storage|module|inverter|chip|model/.test(value)) {
    return "기술";
  }

  if (/리스크|논란|소송|규제|계약|화재|고장|안전|공급망|수출규제|risk|lawsuit|controversy|safety|delay|fire|supply chain|export control/.test(value)) {
    return "리스크";
  }

  return "일반";
}

function makeScore(text = "") {
  const value = String(text).toLowerCase();
  let score = 45;

  if (/태양광|solar|photovoltaic|pv|엔터|kpop|케이팝|k팝|반도체|ai|전기차|배터리/.test(value)) score += 8;
  if (/정책|정부|보조금|규제|policy|subsidy|regulation|ira/.test(value)) score += 10;
  if (/시장|가격|수익|실적|투자|market|price|earnings|investment/.test(value)) score += 10;
  if (/기술|hbm|gpu|ess|ai|배터리|technology|chip|storage|model/.test(value)) score += 10;
  if (/리스크|소송|논란|계약|공급망|risk|lawsuit|controversy|supply chain/.test(value)) score += 12;
  if (/글로벌|미국|중국|일본|유럽|global|china|us|europe|japan/.test(value)) score += 6;

  return Math.min(score, 98);
}

function makeInsight(text = "") {
  const value = String(text).toLowerCase();

  if (/리스크|소송|논란|계약|risk|lawsuit|controversy/.test(value)) {
    return "리스크 이슈가 감지됩니다. 관련 기업, 일정, 계약 조건을 함께 확인해야 합니다.";
  }

  if (/정책|정부|보조금|규제|policy|subsidy|regulation/.test(value)) {
    return "정책 변화가 시장 방향과 사업 판단에 영향을 줄 수 있습니다.";
  }

  if (/시장|가격|수익|실적|투자|market|price|earnings|investment/.test(value)) {
    return "시장성과 수익성 변화 가능성이 있어 관련 지표를 함께 확인할 필요가 있습니다.";
  }

  if (/기술|hbm|gpu|ess|ai|배터리|technology|chip|storage|model/.test(value)) {
    return "기술 변화가 경쟁 구도와 투자 포인트에 영향을 줄 수 있습니다.";
  }

  return "시장 흐름 참고용 기사입니다. 관련 키워드의 반복 여부를 확인하세요.";
}

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
