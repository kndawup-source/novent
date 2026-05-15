function stripHtml(str = ""){
  return String(str || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectCategory(text = ""){
  const value = text.toLowerCase();

  if(/정책|산업부|보조금|지원사업|rps|규제|고시/.test(value)){
    return "정책";
  }

  if(/rec|smp|전력시장|가격|수익|전력거래/.test(value)){
    return "시장";
  }

  if(/ess|배터리|인버터|모듈|효율|저장/.test(value)){
    return "기술";
  }

  if(/계통|지연|화재|고장|민원|리스크|안전/.test(value)){
    return "리스크";
  }

  return "일반";
}

function makeScore(text = ""){
  let score = 45;

  if(/정책|산업부|보조금/.test(text)) score += 18;
  if(/rec|smp|수익|전력시장/.test(text)) score += 15;
  if(/ess|배터리|저장/.test(text)) score += 12;
  if(/계통|리스크|화재/.test(text)) score += 15;

  return Math.min(score, 98);
}

export default async function handler(req,res){

  try{

    const NAVER_ID =
      process.env.NAVER_CLIENT_ID;

    const NAVER_SECRET =
      process.env.NAVER_CLIENT_SECRET;

    if(!NAVER_ID || !NAVER_SECRET){
      return res.status(500).json({
        ok:false,
        message:"NAVER API KEY 없음"
      });
    }

    const q =
      req.query.q ||
      "태양광 OR 재생에너지 OR REC OR SMP OR ESS";

    const url =
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(q)}&display=50&sort=date`;

    const response = await fetch(url,{
      headers:{
        "X-Naver-Client-Id": NAVER_ID,
        "X-Naver-Client-Secret": NAVER_SECRET
      }
    });

    if(!response.ok){
      return res.status(500).json({
        ok:false,
        message:"네이버 뉴스 호출 실패"
      });
    }

    const data = await response.json();

    const articles =
      (data.items || []).map(item => {

        const title =
          stripHtml(item.title || "");

        const summary =
          stripHtml(item.description || "");

        const text =
          `${title} ${summary}`;

        return {
          sourceType:"naver",
          title,
          summary,
          link:item.originallink || item.link,
          pubDate:item.pubDate,
          category:detectCategory(text),
          score:makeScore(text)
        };
      });

    const avg =
      articles.length
        ? Math.round(
            articles.reduce(
              (sum,n)=>sum + Number(n.score || 0),
              0
            ) / articles.length
          )
        : 0;

    return res.status(200).json({
      ok:true,

      articles,

      signal:{
        mood:
          avg >= 75
            ? "시장 관심 확대"
            : avg >= 60
            ? "관심 증가"
            : "관망",

        avgScore:avg,

        summary:
          "네이버 뉴스 기반으로 태양광 산업 흐름을 분석했습니다."
      }
    });

  }catch(error){

    return res.status(500).json({
      ok:false,
      message:error.message
    });
  }
}