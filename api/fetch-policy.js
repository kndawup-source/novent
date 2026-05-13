import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const POLICY_QUERIES = [
  "산업통상자원부 태양광",
  "산업통상자원부 재생에너지",
  "산업통상자원부 ESS",
  "한국에너지공단 태양광",
  "한국에너지공단 재생에너지",
  "한국에너지공단 지원사업",
  "전력거래소 태양광",
  "전력거래소 REC",
  "전력거래소 SMP",
  "전력거래소 계통"
];

export default async function handler(req, res) {
  try {
    let allItems = [];

    for (const query of POLICY_QUERIES) {
      const items = await fetchNaverPolicyNews(query);
      allItems.push(...items);
    }

    const unique = removeDuplicates(allItems)
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, 100);

    const rows = unique.map(item => ({
      title: item.title,
      summary: item.summary,
      link: item.link,
      organization: item.organization,
      category: item.category,
      published_at: item.published_at,
      importance_score: item.importance_score
    }));

    const { data, error } = await supabase
      .from("policy_reports")
      .upsert(rows, { onConflict: "link" })
      .select();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      message: "정책/보도자료 동기화 완료",
      fetched: unique.length,
      saved: data.length,
      items: data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "정책/보도자료 동기화 실패",
      error: error.message
    });
  }
}

async function fetchNaverPolicyNews(query) {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    return [];
  }

  const url =
    "https://openapi.naver.com/v1/search/news.json?" +
    new URLSearchParams({
      query,
      display: "20",
      sort: "date"
    });

  const response = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET
    }
  });

  if (!response.ok) return [];

  const data = await response.json();

  return (data.items || []).map(item => {
    const title = clean(item.title);
    const summary = clean(item.description);
    const text = `${title} ${summary} ${query}`;

    return {
      title,
      summary,
      link: item.originallink || item.link,
      organization: detectOrganization(text),
      category: detectCategory(text),
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      importance_score: scorePolicy(text)
    };
  });
}

function detectOrganization(text) {
  if (/산업통상자원부|산업부/.test(text)) return "산업통상자원부";
  if (/한국에너지공단|에너지공단/.test(text)) return "한국에너지공단";
  if (/전력거래소|KPX/.test(text)) return "전력거래소";
  return "정책/공공기관";
}

function detectCategory(text) {
  if (/보조금|지원사업|공모|사업공고/.test(text)) return "지원사업";
  if (/REC|SMP|전력시장|전력거래/.test(text)) return "전력시장";
  if (/계통|접속|송전|배전/.test(text)) return "계통";
  if (/ESS|배터리|저장/.test(text)) return "ESS";
  if (/정책|고시|제도|산업부|정부/.test(text)) return "정부발표";
  return "정책자료";
}

function scorePolicy(text) {
  let score = 50;

  [
    "산업통상자원부",
    "산업부",
    "한국에너지공단",
    "전력거래소",
    "태양광",
    "재생에너지",
    "신재생",
    "REC",
    "SMP",
    "ESS",
    "계통",
    "전력시장",
    "지원사업",
    "보조금",
    "정책",
    "고시"
  ].forEach(word => {
    if (text.includes(word)) score += 5;
  });

  return Math.min(score, 98);
}

function clean(text = "") {
  return String(text)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function removeDuplicates(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = item.link || item.title;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
