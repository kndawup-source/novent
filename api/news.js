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

  if (summary.length > 180) {
    summary = summary.slice(0, 180) + "...";
  }

  return summary || "기사 내용을 확인해 산업 흐름을 참고하세요.";
}
