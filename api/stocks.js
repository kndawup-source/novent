export default async function handler(req, res){
  try{
    const stocks = [
      {
        name:"한화솔루션",
        symbol:"009830.KS",
        note:"태양광 밸류체인·정책 수혜 관찰"
      },
      {
        name:"HD현대에너지솔루션",
        symbol:"322000.KS",
        note:"모듈·ESS·발전사업 흐름 관찰"
      },
      {
        name:"OCI홀딩스",
        symbol:"010060.KS",
        note:"폴리실리콘·글로벌 공급망 관찰"
      }
    ];

    const items = await Promise.all(
      stocks.map(fetchStock)
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

async function fetchStock(stock){
  try{
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}`;

    const response = await fetch(url, {
      headers:{
        "User-Agent":"Mozilla/5.0"
      }
    });

    if(!response.ok){
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if(!result){
      return null;
    }

    const meta = result.meta || {};

    const current =
      Number(meta.regularMarketPrice || 0);

    const previous =
      Number(meta.previousClose || current);

    if(!current){
      return null;
    }

    const diff =
      current - previous;

    const percent =
      previous
        ? (diff / previous) * 100
        : 0;

    return {
      name:stock.name,
      symbol:stock.symbol,
      price:current,
      diff:Number(diff.toFixed(2)),
      percent:Number(percent.toFixed(2)),
      direction:percent >= 0 ? "up" : "down",
      note:stock.note
    };

  }catch(error){
    return null;
  }
}
