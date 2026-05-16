export default async function handler(req, res) {
  try {
    const industry = normalizeIndustry(req.query.industry);
    const topic = String(req.query.topic || industry || "solar").trim();
    const period = req.query.period || "90";
    const debug = req.query.debug === "1";

    const profile = getNewsProfile(industry, topic);

    const [domesticNews, globalNews] = await Promise.all([
      fetchGoogleDomesticNews(profile, period),
      fetchGoogleGlobalNews(profile)
    ]);

    const articles = removeDuplicates([...domesticNews, ...globalNews])
      .filter(item => item.title && item.link)
      .filter(item => isRelevantToIndustry(item, profile))
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
      industry,
      topic,
      period,
      count: articles.length,

      ...(debug
        ? {
            debug: {
              industry,
              topic,
              domesticCount: domesticNews.length,
              globalCount: globalNews.length,
              finalCount: articles.length,
              domesticQueries: profile.domesticQueries,
              globalQueries: profile.globalQueries,
              provider: "Google News RSS"
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
          ? `${profile.label} 뉴스 데이터를 기반으로 산업 흐름을 분석했습니다.`
          : `${profile.label} 관련 수집 뉴스가 없습니다. 검색어 또는 Google News RSS 상태를 확인해주세요.`
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message
    });
  }
}

function normalizeIndustry(value = "") {
  const key = String(value || "").toLowerCase().trim();

  if (
    [
      "solar",
      "entertainment",
      "semiconductor",
      "ai",
      "mobility",
      "impact"
    ].includes(key)
  ) {
    return key;
  }

  return "solar";
}

function getNewsProfile(industry, topic = "") {
  const profiles = {
    solar: {
      label: "태양광",
      include: [
        "태양광",
        "태양광 발전",
        "태양광 모듈",
        "태양광 인버터",
        "태양광 설치",
        "태양광 사업",
        "태양광 발전소",
        "태양광 정책",
        "태양광 시장",
        "탄소",
        "탄소감축",
        "탄소배출량",
        "탄소중립",
        "기후변화",
        "재생에너지",
        "RE100",
        "넷제로",
        "온실가스",
        "친환경",
        "solar",
        "photovoltaic",
        "solar module",
        "solar farm",
        "solar installation",
        "solar energy",
        "renewable energy",
        "carbon reduction",
        "carbon emissions",
        "net zero",
        "climate change"
      ],
      exclude: [
        "풍력",
        "원자력",
        "원전",
        "수소",
        "바이오",
        "석유",
        "가스",
        "wind power",
        "nuclear",
        "hydrogen",
        "biofuel",
        "oil",
        "gas"
      ],
      topicMap: {
        solar: [
          "태양광",
          "태양광 발전",
          "태양광 모듈",
          "태양광 인버터",
          "태양광 발전소"
        ],
        solar_policy: [
          "태양광 정책",
          "태양광 보조금",
          "태양광 REC",
          "태양광 SMP"
        ],
        solar_market: [
          "태양광 시장",
          "태양광 수익",
          "태양광 투자",
          "태양광 공급망"
        ],
        solar_tech: [
          "태양광 모듈",
          "태양광 인버터",
          "태양광 효율",
          "태양광 ESS"
        ],
        solar_risk: [
          "태양광 화재",
          "태양광 민원",
          "태양광 규제",
          "태양광 안전"
        ],
        solar_climate: [
          "태양광 탄소중립",
          "태양광 탄소감축",
          "태양광 기후변화",
          "태양광 재생에너지",
          "태양광 RE100",
          "태양광 넷제로",
          "태양광 온실가스"
        ]
      },
      global: [
        "solar industry",
        "photovoltaic",
        "solar module",
        "solar farm",
        "solar installation",
        "solar energy",
        "solar net zero",
        "solar carbon reduction",
        "solar renewable energy"
      ]
    },

    entertainment: {
      label: "엔터",
      include: [
        "엔터",
        "엔터테인먼트",
        "케이팝",
        "K팝",
        "K-POP",
        "KPOP",
        "하이브",
        "에스엠",
        "SM",
        "JYP",
        "YG",
        "콘서트",
        "월드투어",
        "음원",
        "팬덤",
        "아이돌",
        "HYBE",
        "BTS",
        "Blackpink",
        "K-pop",
        "Korean music",
        "Korean entertainment"
      ],
      exclude: [],
      topicMap: {
        entertainment: [
          "하이브",
          "SM엔터테인먼트",
          "JYP엔터",
          "YG엔터테인먼트",
          "케이팝",
          "K팝",
          "엔터테인먼트",
          "콘서트",
          "음원",
          "팬덤"
        ],
        entertainment_tour: [
          "컴백",
          "콘서트",
          "월드투어",
          "팬미팅",
          "K팝 투어"
        ],
        entertainment_music: [
          "음원",
          "빌보드",
          "멜론",
          "스포티파이",
          "유튜브 뮤직"
        ],
        entertainment_fandom: [
          "팬덤",
          "위버스",
          "버블",
          "틱톡",
          "굿즈"
        ],
        entertainment_risk: [
          "엔터 리스크",
          "전속계약",
          "소송",
          "논란",
          "아티스트 리스크"
        ]
      },
      global: [
        "K-pop",
        "Kpop",
        "HYBE",
        "BTS",
        "Blackpink",
        "SM Entertainment",
        "JYP Entertainment",
        "YG Entertainment",
        "Korean music industry",
        "Korean entertainment"
      ]
    },

    semiconductor: {
      label: "반도체",
      include: [
        "반도체",
        "HBM",
        "AI칩",
        "GPU",
        "메모리",
        "파운드리",
        "삼성전자",
        "SK하이닉스",
        "TSMC",
        "엔비디아",
        "semiconductor",
        "NVIDIA",
        "chip",
        "foundry",
        "memory"
      ],
      exclude: [],
      topicMap: {
        semiconductor: [
          "반도체",
          "HBM",
          "AI 반도체",
          "삼성전자 반도체",
          "SK하이닉스",
          "파운드리"
        ],
        semiconductor_hbm: [
          "HBM",
          "AI 반도체",
          "엔비디아",
          "GPU",
          "고대역폭메모리"
        ],
        semiconductor_memory: [
          "D램",
          "낸드",
          "메모리 반도체",
          "SK하이닉스",
          "삼성전자 메모리"
        ],
        semiconductor_foundry: [
          "파운드리",
          "TSMC",
          "삼성 파운드리",
          "반도체 위탁생산"
        ],
        semiconductor_risk: [
          "반도체 수출규제",
          "공급망",
          "미국 중국 반도체",
          "반도체 장비"
        ]
      },
      global: [
        "semiconductor",
        "HBM",
        "AI chip",
        "NVIDIA",
        "TSMC",
        "Samsung Electronics",
        "SK Hynix",
        "memory chip"
      ]
    },

    ai: {
      label: "AI",
      include: [
        "AI",
        "인공지능",
        "생성형 AI",
        "LLM",
        "OpenAI",
        "Anthropic",
        "GPU",
        "에이전트",
        "데이터센터",
        "artificial intelligence",
        "generative AI",
        "AI agents"
      ],
      exclude: [],
      topicMap: {
        ai: ["생성형 AI", "인공지능", "LLM", "OpenAI", "GPU"],
        ai_model: ["LLM", "OpenAI", "Anthropic", "Gemini", "Claude"],
        ai_gpu: ["GPU", "엔비디아", "AI 데이터센터", "클라우드"],
        ai_agent: ["AI 에이전트", "업무 AI", "자동화"],
        ai_risk: ["AI 규제", "AI 저작권", "AI 개인정보", "AI 안전"]
      },
      global: [
        "artificial intelligence",
        "generative AI",
        "OpenAI",
        "Anthropic",
        "AI agents",
        "GPU",
        "data center"
      ]
    },

    mobility: {
      label: "모빌리티",
      include: [
        "전기차",
        "EV",
        "배터리",
        "자율주행",
        "로보택시",
        "테슬라",
        "현대차",
        "충전",
        "electric vehicle",
        "Tesla",
        "EV battery",
        "autonomous driving",
        "robotaxi"
      ],
      exclude: [],
      topicMap: {
        mobility: ["전기차", "테슬라", "현대차", "배터리", "자율주행"],
        mobility_ev: ["전기차", "EV", "현대차", "테슬라"],
        mobility_battery: ["배터리", "리튬", "LFP", "전고체"],
        mobility_auto: ["자율주행", "로보택시", "ADAS"],
        mobility_charge: ["충전소", "충전 인프라", "전기차 보조금"]
      },
      global: [
        "electric vehicle",
        "Tesla",
        "EV battery",
        "autonomous driving",
        "robotaxi",
        "mobility industry"
      ]
    },

    impact: {
      label: "임팩트",
      include: [
        "ESG",
        "사회공헌",
        "지속가능경영",
        "지속가능성",
        "탄소중립",
        "RE100",
        "기후변화",
        "탄소감축",
        "탄소배출량",
        "온실가스",
        "기부",
        "캠페인",
        "지역사회",
        "브랜드 평판",
        "기업 평판",
        "사회적 가치",
        "sustainability",
        "corporate social responsibility",
        "CSR",
        "ESG investing",
        "net zero",
        "carbon reduction",
        "climate change",
        "brand reputation",
        "social impact"
      ],
      exclude: [],
      topicMap: {
        impact: [
          "ESG",
          "사회공헌",
          "지속가능경영",
          "탄소중립",
          "기후변화",
          "브랜드 평판"
        ],
        impact_esg: [
          "ESG",
          "ESG 경영",
          "ESG 투자",
          "ESG 평가",
          "지속가능경영"
        ],
        impact_csr: [
          "사회공헌",
          "기업 사회공헌",
          "기부",
          "지역사회",
          "CSR"
        ],
        impact_sustainability: [
          "지속가능경영",
          "탄소중립",
          "RE100",
          "탄소감축",
          "기후변화",
          "온실가스"
        ],
        impact_reputation: [
          "브랜드 평판",
          "기업 평판",
          "ESG 평가",
          "사회적 가치"
        ]
      },
      global: [
        "ESG",
        "corporate social responsibility",
        "CSR",
        "sustainability",
        "net zero",
        "carbon reduction",
        "climate change",
        "brand reputation",
        "social impact"
      ]
    }
  };

  const profile = profiles[industry] || profiles.solar;

  const isPresetTopic = Boolean(profile.topicMap[topic] || topic === industry);

  const domesticQueries = isPresetTopic
    ? profile.topicMap[topic] ||
      profile.topicMap[industry] ||
      Object.values(profile.topicMap)[0]
    : [topic];

  const globalQueries = isPresetTopic ? profile.global : [topic];

  return {
    ...profile,
    industry,
    topic,
    domesticQueries: domesticQueries.slice(0, 12),
    globalQueries: globalQueries.slice(0, 10)
  };
}

async function fetchGoogleDomesticNews(profile, period) {
  const results = await Promise.all(
    profile.domesticQueries.map(query =>
      fetchGoogleRss({
        q: period && period !== "all" ? `${query} when:${period}d` : query,
        hl: "ko",
        gl: "KR",
        ceid: "KR:ko",
        sourceType: "google",
        fallbackSource: "Google News KR",
        industry: profile.industry,
        profile,
        limit: 12
      })
    )
  );

  return removeDuplicates(results.flat()).slice(0, 70);
}

async function fetchGoogleGlobalNews(profile) {
  const results = await Promise.all(
    profile.globalQueries.map(query =>
      fetchGoogleRss({
        q: query,
        hl: "en-US",
        gl: "US",
        ceid: "US:en",
        sourceType: "global",
        fallbackSource: "Google News Global",
        industry: profile.industry,
        profile,
        limit: 12
      })
    )
  );

  return removeDuplicates(results.flat()).slice(0, 50);
}

async function fetchGoogleRss({
  q,
  hl,
  gl,
  ceid,
  sourceType,
  fallbackSource,
  industry,
  profile,
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
        industry,
        sourceType,
        source: clean(getTag(item, "source")) || fallbackSource,
        title: getTag(item, "title"),
        rawSummary: getTag(item, "description"),
        link: getTag(item, "link"),
        pubDate: getTag(item, "pubDate"),
        profile
      });
    });
  } catch {
    return [];
  }
}

function normalizeArticle({
  industry,
  sourceType,
  source,
  title,
  rawSummary,
  link,
  pubDate,
  profile
}) {
  const cleanTitle = clean(title);
  const cleanSource = clean(source);
  const cleanSummary = clean(rawSummary);
  const text = `${cleanTitle} ${cleanSummary}`;

  return {
    industry,
    sourceType,
    source: cleanSource,
    title: cleanTitle,
    rawSummary: cleanSummary,
    summary: makeReadableSummary(rawSummary),
    link: clean(link),
    pubDate: clean(pubDate),
    category: detectCategory(text),
    score: makeScore(text, profile),
    insight: makeInsight(text)
  };
}

function isRelevantToIndustry(item, profile) {
  const text = `${item.title || ""} ${item.rawSummary || ""} ${item.summary || ""}`.toLowerCase();

  const includeHit = profile.include.some(word =>
    text.includes(String(word).toLowerCase())
  );

  const excludeHit = profile.exclude.some(word =>
    text.includes(String(word).toLowerCase())
  );

  if (excludeHit) return false;

  if (item.sourceType === "global") {
    return true;
  }

  if (profile.topic && !profile.topicMap?.[profile.topic]) {
    return true;
  }

  return includeHit;
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
    .replace(/<li\b[^>]*>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<font\b[^>]*>(.*?)<\/font>/gi, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeReadableSummary(description = "") {
  let text = clean(description || "");

  text = text
    .replace(/Google 뉴스에서 전체 콘텐츠 보기/gi, "")
    .replace(/Google News에서 전체 콘텐츠 보기/gi, "")
    .replace(/Google 뉴스/gi, "")
    .replace(/Google News/gi, "")
    .replace(/관련기사/gi, "")
    .replace(/전체 기사 보기/gi, "")
    .replace(/기사 원문/gi, "")
    .replace(/더보기/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 220) {
    text = text.slice(0, 220) + "...";
  }

  return text;
}

function detectCategory(text = "") {
  const value = String(text).toLowerCase();

  if (/정책|정부|규제|법안|보조금|지원사업|policy|subsidy|regulation|tax credit|ESG 평가|사회적 가치/.test(value)) {
    return "정책";
  }

  if (/시장|가격|수익|매출|실적|투자|주가|market|price|revenue|earnings|investment|finance|stock|브랜드 평판|기업 평판/.test(value)) {
    return "시장";
  }

  if (/기술|ai|hbm|gpu|반도체|배터리|ess|인버터|플랫폼|streaming|technology|battery|chip|model/.test(value)) {
    return "기술";
  }

  if (/리스크|논란|소송|계약|화재|고장|안전|공급망|risk|lawsuit|controversy|safety|delay|supply chain|탄소배출|온실가스/.test(value)) {
    return "리스크";
  }

  return "일반";
}

function makeScore(text = "", profile) {
  const value = String(text).toLowerCase();
  let score = 45;

  profile.include.forEach(word => {
    if (value.includes(String(word).toLowerCase())) {
      score += 4;
    }
  });

  if (/정책|정부|보조금|규제|policy|subsidy|regulation|ESG/.test(value)) score += 8;
  if (/시장|가격|수익|실적|투자|market|price|earnings|investment|평판/.test(value)) score += 8;
  if (/기술|hbm|gpu|ess|ai|배터리|technology|chip|storage|model/.test(value)) score += 8;
  if (/리스크|소송|논란|계약|공급망|risk|lawsuit|controversy|supply chain|탄소배출량|온실가스/.test(value)) score += 10;
  if (/글로벌|미국|중국|일본|유럽|global|china|us|europe|japan|climate|sustainability/.test(value)) score += 5;

  return Math.min(score, 98);
}

function makeInsight(text = "") {
  const value = String(text).toLowerCase();

  if (/리스크|소송|논란|계약|risk|lawsuit|controversy/.test(value)) {
    return "리스크 이슈가 감지됩니다. 관련 기업, 일정, 계약 조건을 함께 확인해야 합니다.";
  }

  if (/정책|정부|보조금|규제|policy|subsidy|regulation|ESG/.test(value)) {
    return "정책 변화가 시장 방향과 사업 판단에 영향을 줄 수 있습니다.";
  }

  if (/시장|가격|수익|실적|투자|market|price|earnings|investment|평판/.test(value)) {
    return "시장성과 평판 변화 가능성이 있어 관련 지표를 함께 확인할 필요가 있습니다.";
  }

  if (/기술|hbm|gpu|ess|ai|배터리|technology|chip|storage|model/.test(value)) {
    return "기술 변화가 경쟁 구도와 투자 포인트에 영향을 줄 수 있습니다.";
  }

  if (/사회공헌|기부|지역사회|지속가능|sustainability|csr|social impact/.test(value)) {
    return "사회공헌과 지속가능성 이슈가 브랜드 신뢰도에 영향을 줄 수 있습니다.";
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
