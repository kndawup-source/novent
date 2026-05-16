export default async function handler(req, res){
  try{
    const industry = req.query.industry || "solar";

    const groups = {
      solar: [
        { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 대표 지수" },
        { group:"국내 증시", name:"KOSDAQ", symbol:"^KQ11", note:"성장주·중소형주 흐름" },
        { group:"국내 관련주", name:"한화솔루션", symbol:"009830.KS", note:"태양광 밸류체인" },
        { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"미국 기술주 흐름" },
        { group:"미국 관련주", name:"First Solar", symbol:"FSLR", note:"미국 태양광 대표주" },
        { group:"미국 관련주", name:"Enphase", symbol:"ENPH", note:"인버터·에너지 관리" },
        { group:"미국 관련주", name:"SolarEdge", symbol:"SEDG", note:"태양광 인버터" },
        { group:"중국 증시", name:"Shanghai", symbol:"000001.SS", note:"중국 본토 시장" },
        { group:"중국 관련주", name:"JinkoSolar", symbol:"JKS", note:"중국 태양광 모듈" },
        { group:"중국 관련주", name:"Daqo New Energy", symbol:"DQ", note:"폴리실리콘 공급망" },
        { group:"중국 관련주", name:"Canadian Solar", symbol:"CSIQ", note:"중국계 글로벌 모듈" }
      ],

      entertainment: [
        { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 대표 지수" },
        { group:"국내 관련주", name:"HYBE", symbol:"352820.KS", note:"K-POP·팬덤 플랫폼" },
        { group:"국내 관련주", name:"JYP Ent.", symbol:"035900.KQ", note:"아티스트·글로벌 투어" },
        { group:"국내 관련주", name:"SM Ent.", symbol:"041510.KQ", note:"K-POP IP" },
        { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"미국 성장주 흐름" },
        { group:"미국 관련주", name:"Spotify", symbol:"SPOT", note:"음원 스트리밍" },
        { group:"미국 관련주", name:"Live Nation", symbol:"LYV", note:"글로벌 공연·티켓" },
        { group:"미국 관련주", name:"Netflix", symbol:"NFLX", note:"콘텐츠 플랫폼" }
      ],

      semiconductor: [
        { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 대표 지수" },
        { group:"국내 관련주", name:"삼성전자", symbol:"005930.KS", note:"메모리·파운드리" },
        { group:"국내 관련주", name:"SK하이닉스", symbol:"000660.KS", note:"HBM·메모리" },
        { group:"국내 관련주", name:"한미반도체", symbol:"042700.KS", note:"반도체 장비" },
        { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"미국 기술주 흐름" },
        { group:"미국 관련주", name:"NVIDIA", symbol:"NVDA", note:"GPU·AI칩" },
        { group:"미국 관련주", name:"AMD", symbol:"AMD", note:"AI 반도체" },
        { group:"미국 관련주", name:"Intel", symbol:"INTC", note:"CPU·파운드리" },
        { group:"중국 증시", name:"Shanghai", symbol:"000001.SS", note:"중국 본토 시장" },
        { group:"중국 관련주", name:"SMIC", symbol:"0981.HK", note:"중국 파운드리" }
      ],

      ai: [
        { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"AI 성장주 흐름" },
        { group:"미국 관련주", name:"NVIDIA", symbol:"NVDA", note:"AI GPU" },
        { group:"미국 관련주", name:"Microsoft", symbol:"MSFT", note:"AI 클라우드" },
        { group:"미국 관련주", name:"Alphabet", symbol:"GOOGL", note:"AI 모델·검색" },
        { group:"미국 관련주", name:"Meta", symbol:"META", note:"오픈소스 AI" },
        { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 대표 지수" },
        { group:"국내 관련주", name:"NAVER", symbol:"035420.KS", note:"한국형 AI·검색" },
        { group:"국내 관련주", name:"카카오", symbol:"035720.KS", note:"AI 서비스" }
      ],

      mobility: [
        { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 대표 지수" },
        { group:"국내 관련주", name:"현대차", symbol:"005380.KS", note:"전기차·완성차" },
        { group:"국내 관련주", name:"기아", symbol:"000270.KS", note:"EV·글로벌 판매" },
        { group:"국내 관련주", name:"LG에너지솔루션", symbol:"373220.KS", note:"배터리" },
        { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"미국 성장주 흐름" },
        { group:"미국 관련주", name:"Tesla", symbol:"TSLA", note:"EV·자율주행" },
        { group:"미국 관련주", name:"Rivian", symbol:"RIVN", note:"전기 픽업·상용 EV" },
        { group:"중국 증시", name:"Shanghai", symbol:"000001.SS", note:"중국 본토 시장" },
        { group:"중국 관련주", name:"NIO", symbol:"NIO", note:"중국 EV" },
        { group:"중국 관련주", name:"XPeng", symbol:"XPEV", note:"중국 스마트 EV" }
      ]
    };

    const targets = groups[industry] || groups.solar;
    const items = await Promise.all(targets.map(fetchMarket));

    return res.status(200).json({
      ok:true,
      industry,
      items:items.filter(Boolean)
    });
  }catch(error){
    return res.status(500).json({
      ok:false,
      message:error.message
    });
  }
}

async function fetchMarket(item){
  try{
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}`;

    const response = await fetch(url, {
      headers:{ "User-Agent":"Mozilla/5.0" }
    });

    if(!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if(!result) return null;

    const meta = result.meta || {};
    const current = Number(meta.regularMarketPrice || 0);
    const previous = Number(meta.previousClose || current);

    if(!current) return null;

    const diff = current - previous;
    const percent = previous ? (diff / previous) * 100 : 0;

    return {
      group:item.group,
      name:item.name,
      symbol:item.symbol,
      price:current,
      diff:Number(diff.toFixed(2)),
      percent:Number(percent.toFixed(2)),
      direction:percent >= 0 ? "up" : "down",
      note:item.note
    };
  }catch(error){
    return null;
  }
}
