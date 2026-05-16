export default async function handler(req, res){
  try{
    const markets = [
      { group:"국내 증시", name:"KOSPI", symbol:"^KS11", note:"국내 시장 대표 지수" },
      { group:"국내 증시", name:"KOSDAQ", symbol:"^KQ11", note:"성장주·중소형주 흐름" },
      { group:"국내 관련주", name:"한화솔루션", symbol:"009830.KS", note:"태양광 밸류체인·정책 수혜 관찰" },
      { group:"국내 관련주", name:"HD현대에너지솔루션", symbol:"322000.KS", note:"모듈·ESS·발전사업 흐름 관찰" },
      { group:"국내 관련주", name:"OCI홀딩스", symbol:"010060.KS", note:"폴리실리콘·글로벌 공급망 관찰" },

      { group:"미국 증시", name:"NASDAQ", symbol:"^IXIC", note:"성장주·기술주 투자심리" },
      { group:"미국 증시", name:"S&P 500", symbol:"^GSPC", note:"미국 대표 시장 흐름" },
      { group:"미국 관련주", name:"First Solar", symbol:"FSLR", note:"미국 태양광 대표주" },
      { group:"미국 관련주", name:"Enphase", symbol:"ENPH", note:"인버터·에너지 관리" },
      { group:"미국 관련주", name:"Tesla", symbol:"TSLA", note:"ESS·에너지 저장 흐름" },

      { group:"중국 증시", name:"Shanghai", symbol:"000001.SS", note:"중국 본토 시장 흐름" },
      { group:"중국 증시", name:"CSI 300", symbol:"000300.SS", note:"중국 대형주 흐름" },
      { group:"중국 관련주", name:"JinkoSolar", symbol:"JKS", note:"중국 태양광 모듈" }
    ];

    const items = await Promise.all(
      markets.map(fetchMarket)
    );

    return res.status(200).json({
      ok:true,
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
