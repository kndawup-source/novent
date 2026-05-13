import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const policies = [];

    const motie = await fetchMOTIE();
    const energy = await fetchEnergy();
    const kpx = await fetchKPX();

    policies.push(...motie);
    policies.push(...energy);
    policies.push(...kpx);

    const unique = removeDuplicates(policies);

    const rows = unique.map(item => ({
      title: item.title,
      summary: item.summary,
      link: item.link,
      organization: item.organization,
      category: item.category,
      published_at: item.publishedAt,
      importance_score: item.score
    }));

    const { data, error } = await supabase
      .from("policy_reports")
      .upsert(rows, { onConflict: "link" })
      .select();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      saved: data.length,
      policies: data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

async function fetchMOTIE() {
  const url =
    "https://www.motie.go.kr/www/selectBbsNttList.do?bbsNo=81&key=86";

  const response = await fetch(url);
  const html = await response.text();

  const results = [];

  const regex =
    /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;

  const matches = [...html.matchAll(regex)].slice(0, 20);

  matches.forEach(match => {
    const title = clean(match[2]);

    if (!isEnergyRelated(title)) return;

    results.push({
      organization: "산업통상자원부",
      category: "정부발표",
      title,
      summary: "산업통상자원부 정책 및 보도자료",
      link: absoluteUrl("https://www.motie.go.kr", match[1]),
      publishedAt: new Date().toISOString(),
      score: scorePolicy(title)
    });
  });

  return results;
}

async function fetchEnergy() {
  const url = "https://www.energy.or.kr";

  const response = await fetch(url);
  const html = await response.text();

  const results = [];

  const regex =
    /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;

  const matches = [...html.matchAll(regex)].slice(0, 20);

  matches.forEach(match => {
    const title = clean(match[2]);

    if (!isEnergyRelated(title)) return;

    results.push({
      organization: "한국에너지공단",
      category: "지원사업",
      title,
      summary: "한국에너지공단 공지 및 지원사업",
      link: absoluteUrl("https://www.energy.or.kr", match[1]),
      publishedAt: new Date().toISOString(),
      score: scorePolicy(title)
    });
  });

  return results;
}

async function fetchKPX() {
  const url = "https://www.kpx.or.kr";

  const response = await fetch(url);
  const html = await response.text();

  const results = [];

  const regex =
    /<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;

  const matches = [...html.matchAll(regex)].slice(0, 20);

  matches.forEach(match => {
    const title = clean(match[2]);

    if (!isEnergyRelated(title)) return;

    results.push({
      organization: "전력거래소",
      category: "전력시장",
      title,
      summary: "전력거래소 시장 및 계통 공지",
      link: absoluteUrl("https://www.kpx.or.kr", match[1]),
      publishedAt: new Date().toISOString(),
      score: scorePolicy(title)
    });
  });

  return results;
}

function isEnergyRelated(text) {
  return /태양광|재생에너지|신재생|ESS|REC|SMP|전력|계통|에너지|배터리|전기/.test(text);
}

function scorePolicy(text) {
  let score = 50;

  [
    "태양광",
    "재생에너지",
    "REC",
    "SMP",
    "ESS",
    "계통",
    "전력시장",
    "지원사업",
    "보조금",
    "산업부",
    "정책"
  ].forEach(word => {
    if (text.includes(word)) score += 6;
  });

  return Math.min(score, 98);
}

function clean(text = "") {
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(base, path) {
  if (!path) return base;

  if (path.startsWith("http")) return path;

  return base + path;
}

function removeDuplicates(items) {
  const seen = new Set();

  return items.filter(item => {
    const key = item.link;

    if (!key) return false;
    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}
