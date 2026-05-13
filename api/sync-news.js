import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const query = req.query.q || "태양광 OR 재생에너지 OR REC OR SMP OR ESS";

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase 환경변수가 없습니다.");
    }

    const naverArticles = await fetchNaverNews(query);
    const googleArticles = await fetchGoogleNews(query);

    const articles = removeDuplicates([
      ...naverArticles,
      ...googleArticles
    ])
      .map(article => ({
        ...article,
        finalScore: article.sourceType === "naver"
          ? article.score + 8
          : article.score
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 100);

    const rows = articles.map(article => ({
      title: article.title,
      summary: article.summary,
      link: article.link,
      source: article.source,
      source_type: article.sourceType,
      category: article.category,
      score: article.score,
      insight: article.insight,
      pub_date: parseDate(article.pubDate),
      raw_text: `${article.title || ""} ${article.summary || ""}`
    }));

    const { data, error } = await supabase
      .from("news_articles")
      .upsert(rows, { onConflict: "link" })
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      message: "뉴스 동기화 완료",
      query,
      fetched: articles.length,
      saved: data.length,
      naverCount: naverArticles.length,
      googleCount: googleArticles.length,
      articles: data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "뉴스 동기화 실패",
      error: error.message
    });
  }
}

async function fetchNaverNews(query) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    return [];
  }

  const url =
    "https://openapi.naver.com/v1/search/news.json?" +
    new URLSearchParams({
      query,
      display: "50",
      sort: "date"
    });

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return (data.items || [])
    .map(item => {
      const title = clean(item.title);
      const summary = clean(item.description);
      const text = `${title} ${summary}`;

      return {
        sourceType: "naver",
        source: "Naver",
        title,
        summary: summary || "요약 정보가 없습니다.",
        link: item.originallink || item.link,
        image: "",
        pubDate: item.pubDate,
        category: classify(text),
        score: scoreArticle(text),
        insight: makeInsight(text)
      };
    })
    .filter(article => article.title && article.link);
}

async function fetchGoogleNews(query) {
  const rssUrl =
    "https://news.google.com/rss/search?" +
    new URLSearchParams({
      q: query,
      hl: "ko",
      gl: "KR",
      ceid: "KR:ko"
    });

  const response = await fetch(rssUrl);

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, 50)
    .map(match => {
      const item = match[1];

      const title = clean(getTag(item, "title"));
      const source = clean(getTag(item, "source")) || "Google News";
      const rawDescription = getTag(item, "description");
      const summary = makeReadableSummary(rawDescription, title, source);
      const link = getTag(item, "link");
      const pubDate = getTag(item, "pubDate");

      const text = `${title} ${summary}`;

      return {
        sourceType: "google",
        source,
        title,
        summary,
        link,
        image: "",
        pubDate,
        category: classify(text),
        score: scoreArticle(text),
        insight: makeInsight(text)
      };
    })
    .filter(article => article.title && article.link);
}

function getTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : "";
}

function clean(text = "") {
  let value = String(text);

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
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
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

  return text || "요약 정보가 없습니다.";
}

function classify(text) {
  if (/정부|정책|산업부|보조금|입찰|RPS|공급의무|규제|고시|지원사업/.test(text)) {
    return "정책";
  }

  if (/REC|SMP|가격|수익|투자|전력시장|전기요금|매출|금리|계약|전력거래/.test(text)) {
    return "시장";
  }

  if (/ESS|인버터|배터리|모듈|효율|AI|기술|저장|솔루션|전력저장/.test(text)) {
    return "기술";
  }

  if (/계통|지연|화재|고장|손실|부도|위험|리스크|민원|중단|폐업|안전/.test(text)) {
    return "리스크";
  }

  return "일반";
}

function scoreArticle(text) {
  let score = 45;

  [
    "태양광",
    "재생에너지",
    "신재생",
    "정책",
    "산업부",
    "보조금",
    "REC",
    "SMP",
    "ESS",
    "계통",
    "전력시장",
    "수익",
    "투자",
    "인버터",
    "리스크",
    "규제",
    "지원사업",
    "전력거래"
  ].forEach(word => {
    if (text.includes(word)) {
      score += 4;
    }
  });

  if (/계통|지연|화재|규제|손실|민원/.test(text)) score += 8;
  if (/ESS|배터리|저장/.test(text)) score += 6;
  if (/REC|SMP|전력시장|가격/.test(text)) score += 6;
  if (/정부|산업부|정책|보조금|지원사업/.test(text)) score += 6;

  return Math.min(score, 98);
}

function makeInsight(text) {
  if (/계통|지연/.test(text)) {
    return "신규 발전소 개발 일정과 계통 접속 가능성을 점검해야 합니다.";
  }

  if (/REC|SMP|가격|전력시장|전력거래/.test(text)) {
    return "수익성 변동 가능성이 있어 REC/SMP 흐름과 계약 조건을 확인해야 합니다.";
  }

  if (/ESS|배터리|저장/.test(text)) {
    return "ESS 연계 사업 또는 저장형 수익 모델 확장 기회로 볼 수 있습니다.";
  }

  if (/정부|정책|보조금|산업부|지원사업/.test(text)) {
    return "정책 변화가 수주, 투자, 제안서 방향에 영향을 줄 수 있습니다.";
  }

  if (/화재|고장|리스크|손실|민원|안전/.test(text)) {
    return "안전관리, 유지보수, 민원 대응 체계를 점검해야 합니다.";
  }

  return "시장 흐름 참고용 기사입니다. 관련 키워드의 반복 여부를 지켜볼 필요가 있습니다.";
}

function removeDuplicates(articles) {
  const seen = new Set();

  return articles.filter(article => {
    const key = normalizeKey(article.link || article.title);

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeKey(value = "") {
  return String(value)
    .replace(/^https?:\/\//, "")
    .replace(/[\?#].*$/, "")
    .replace(/\s/g, "")
    .replace(/[^\w가-힣/.-]/g, "")
    .slice(0, 120);
}

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
