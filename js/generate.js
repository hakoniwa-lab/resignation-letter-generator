/*
 * 退職願・退職届の文面生成ロジック。DOM・windowの状態には触れない純粋関数のみで構成する。
 */

// 西暦→和暦(令和)変換。令和1年=2019年。それ以前の日付は西暦表記にフォールバックする。
function toEraDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (y >= 2019) {
    const reiwaYear = y - 2018;
    const yearLabel = reiwaYear === 1 ? "令和元年" : `令和${reiwaYear}年`;
    return `${yearLabel}${m}月${d}日`;
  }
  return `${y}年${m}月${d}日`;
}

// ローカルタイムゾーンでの「今日」をYYYY-MM-DD形式で取得する(toISOString()はUTC変換されるため、
// 日本時間の深夜早朝に実行すると日付が1日ずれるバグがあった。ローカルの年月日をそのまま組み立てる)
function todayLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildLetterText(input) {
  const { letterType, name, department, resignDate, companyName, representativeName, reasonClause } = input;

  const isRequest = letterType === "request"; // 退職願(お願い) or 退職届(通知)
  const title = isRequest ? "退職願" : "退職届";
  const resignDateEra = toEraDate(resignDate) || "";
  const todayEra = toEraDate(todayLocalDateString()) || "";
  // reasonClauseは「一身上の都合により」のように接続助詞まで含んだ一続きの句として扱う(二重助詞を避けるため)
  const reasonText = reasonClause && reasonClause.trim() ? reasonClause.trim() : "一身上の都合により";
  const closingSentence = isRequest
    ? `${reasonText}、${resignDateEra}をもって退職いたしたく、ここにお願い申し上げます。`
    : `${reasonText}、${resignDateEra}をもって退職いたします。`;

  const lines = [];
  lines.push(title);
  lines.push("");
  lines.push("私儀");
  lines.push(closingSentence);
  lines.push("");
  lines.push(todayEra);
  lines.push("");
  if (department && department.trim()) {
    lines.push(department.trim());
  }
  lines.push(`${name || "（氏名）"}　印`);
  lines.push("");
  lines.push(`${companyName || "（会社名）"}`);
  lines.push(`${representativeName || "代表取締役　（代表者名）"}　殿`);

  return lines.join("\n");
}
