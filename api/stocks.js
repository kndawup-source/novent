const STOCK_MAP = {
  solar: [
    ["한국 대표주", "한화솔루션", "009830.KS", "태양광 소재·모듈"],
    ["한국 대표주", "OCI홀딩스", "010060.KS", "폴리실리콘·소재"],
    ["한국 대표주", "HD현대에너지솔루션", "322000.KS", "태양광 모듈"],

    ["미국 대표주", "First Solar", "FSLR", "미국 태양광 대표주"],
    ["미국 대표주", "Enphase Energy", "ENPH", "인버터·에너지 관리"],
    ["미국 대표주", "Sunrun", "RUN", "주거용 태양광"],

    ["일본 대표주", "Kyocera", "6971.T", "태양광·전자소재"],
    ["일본 대표주", "Panasonic", "6752.T", "에너지 솔루션"],
    ["일본 대표주", "Sharp", "6753.T", "태양광·전자제품"],

    ["중국 대표주", "LONGi", "601012.SS", "태양광 웨이퍼·모듈"],
    ["중국 대표주", "Trina Solar", "688599.SS", "태양광 모듈"],
    ["중국 대표주", "JinkoSolar", "688223.SS", "태양광 모듈"]
  ],

  entertainment: [
    ["한국 대표주", "HYBE", "352820.KS", "K-POP·팬덤 플랫폼"],
    ["한국 대표주", "SM", "041510.KQ", "엔터테인먼트"],
    ["한국 대표주", "JYP", "035900.KQ", "엔터테인먼트"],

    ["미국 대표주", "Warner Music", "WMG", "글로벌 음악"],
    ["미국 대표주", "Live Nation", "LYV", "공연·티켓"],
    ["미국 대표주", "Spotify", "SPOT", "음원 플랫폼"],

    ["일본 대표주", "Sony", "6758.T", "음악·콘텐츠"],
    ["일본 대표주", "Avex", "7860.T", "음악·엔터"],
    ["일본 대표주", "Toho", "9602.T", "영화·콘텐츠"],

    ["중국 대표주", "Tencent Music", "TME", "중국 음원 플랫폼"],
    ["중국 대표주", "NetEase", "9999.HK", "게임·음악"],
    ["중국 대표주", "Bilibili", "9626.HK", "콘텐츠 플랫폼"]
  ],

  semiconductor: [
    ["한국 대표주", "삼성전자", "005930.KS", "메모리·파운드리"],
    ["한국 대표주", "SK하이닉스", "000660.KS", "HBM·메모리"],
    ["한국 대표주", "한미반도체", "042700.KS", "반도체 장비"],

    ["미국 대표주", "NVIDIA", "NVDA", "AI 반도체"],
    ["미국 대표주", "AMD", "AMD", "GPU·AI칩"],
    ["미국 대표주", "Broadcom", "AVGO", "AI·네트워크 칩"],

    ["일본 대표주", "Tokyo Electron", "8035.T", "반도체 장비"],
    ["일본 대표주", "Advantest", "6857.T", "반도체 테스트"],
    ["일본 대표주", "Renesas", "6723.T", "차량용 반도체"],

    ["중국 대표주", "SMIC", "0981.HK", "중국 파운드리"],
    ["중국 대표주", "Hua Hong", "1347.HK", "파운드리"],
    ["중국 대표주", "Will Semiconductor", "603501.SS", "이미지센서"]
  ],

  ai: [
    ["한국 대표주", "NAVER", "035420.KS", "AI·클라우드"],
    ["한국 대표주", "카카오", "035720.KS", "AI 서비스"],
    ["한국 대표주", "삼성전자", "005930.KS", "AI 반도체"],

    ["미국 대표주", "NVIDIA", "NVDA", "AI 인프라"],
    ["미국 대표주", "Microsoft", "MSFT", "AI 플랫폼"],
    ["미국 대표주", "AMD", "AMD", "AI칩"],

    ["일본 대표주", "SoftBank", "9984.T", "AI 투자"],
    ["일본 대표주", "Fujitsu", "6702.T", "AI·클라우드"],
    ["일본 대표주", "NEC", "6701.T", "AI 솔루션"],

    ["중국 대표주", "Baidu", "9888.HK", "AI 검색·모델"],
    ["중국 대표주", "Alibaba", "9988.HK", "AI 클라우드"],
    ["중국 대표주", "Tencent", "0700.HK", "AI·플랫폼"]
  ],

  mobility: [
    ["한국 대표주", "현대차", "005380.KS", "전기차·모빌리티"],
    ["한국 대표주", "기아", "000270.KS", "전기차"],
    ["한국 대표주", "LG에너지솔루션", "373220.KS", "배터리"],

    ["미국 대표주", "Tesla", "TSLA", "전기차·로보택시"],
    ["미국 대표주", "Rivian", "RIVN", "전기차"],
    ["미국 대표주", "Uber", "UBER", "모빌리티 플랫폼"],

    ["일본 대표주", "Toyota", "7203.T", "전동화·하이브리드"],
    ["일본 대표주", "Honda", "7267.T", "모빌리티"],
    ["일본 대표주", "Nissan", "7201.T", "전기차"],

    ["중국 대표주", "BYD", "1211.HK", "전기차·배터리"],
    ["중국 대표주", "NIO", "9866.HK", "전기차"],
    ["중국 대표주", "Li Auto", "2015.HK", "전기차"]
  ],

  impact: [
    ["한국 대표주", "SK", "034730.KS", "ESG·사회적 가치"],
    ["한국 대표주", "LG화학", "051910.KS", "친환경 소재"],
    ["한국 대표주", "POSCO홀딩스", "005490.KS", "탄소감축·소재"],

    ["미국 대표주", "NextEra Energy", "NEE", "재생에너지"],
    ["미국 대표주", "Waste Management", "WM", "환경·순환경제"],
    ["미국 대표주", "Brookfield Renewable", "BEP", "재생에너지 인프라"],

    ["일본 대표주", "Hitachi", "6501.T", "사회 인프라"],
    ["일본 대표주", "Toray", "3402.T", "친환경 소재"],
    ["일본 대표주", "Panasonic", "6752.T", "에너지 솔루션"],

    ["중국 대표주", "BYD", "1211.HK", "전기차·배터리"],
    ["중국 대표주", "LONGi", "601012.SS", "재생에너지"],
    ["중국 대표주", "CATL", "300750.SZ", "배터리"]
  ]
};

export default async function handler(req, res) {
  try {
    const industry = normalizeIndustry(req.query.industry);
    const stocks = STOCK_MAP[industry] || STOCK_MAP.solar;

    const items = await Promise.all(
      stocks.map(async ([group, name, symbol, note]) => {
        const quote = await fetchYahooQuote(symbol);

        return {
          group,
          name,
          symbol,
          note,
          price: quote.price,
          percent: quote.percent,
          direction: quote.percent >= 0 ? "up" : "down"
        };
      })
    );

    return res.status(200).json({
      ok: true,
      industry,
      count: items.length,
      items
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

async function fetchYahooQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=1d`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) throw new Error("Yahoo quote failed");

    const data = await response.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta || {};

    const price =
      Number(meta.regularMarketPrice) ||
      Number(meta.previousClose) ||
      0;

    const previous =
      Number(meta.chartPreviousClose) ||
      Number(meta.previousClose) ||
      price;

    const percent =
      previous && price
        ? ((price - previous) / previous) * 100
        : 0;

    return {
      price: roundPrice(price),
      percent: Number(percent.toFixed(2))
    };
  } catch {
    return {
      price: 0,
      percent: 0
    };
  }
}

function roundPrice(value) {
  const num = Number(value || 0);

  if (num >= 1000) return Math.round(num);
  if (num >= 100) return Number(num.toFixed(1));
  return Number(num.toFixed(2));
}
