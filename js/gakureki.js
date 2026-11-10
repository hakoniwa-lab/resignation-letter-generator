/*
 * 履歴書の学歴欄の自動計算。前半は DOM に触れない純粋な計算(node で検算できる)、後半が画面。
 * 入力はどこにも保存せず、外部にも送らない。
 *
 * 入学の年: 学校教育法17条「子の満六歳に達した日の翌日以後における最初の学年の初めから」。
 *   満年齢は誕生日の前日の終わりに1つ増える(年齢計算ニ関スル法律)ので、4月1日生まれは3月31日に満6歳になり、その翌日の4月1日が「最初の学年の初め」になる。
 *   よって 1月1日〜4月1日生まれは 生まれ年+6、4月2日〜12月31日生まれは 生まれ年+7 に小学校へ入学する。
 */

// 西暦の年月 → { era, year } 。改元の月をまたぐ年は月で分ける
function gkEra(y, m, d) {
  const dd = d || 1;
  const n = y * 10000 + m * 100 + dd;
  if (n >= 20190501) return { era: "令和", year: y - 2018 };
  if (n >= 19890108) return { era: "平成", year: y - 1988 };
  if (n >= 19261225) return { era: "昭和", year: y - 1925 };
  return { era: "大正", year: y - 1911 };
}
function gkEraYear(y, m, d) {
  const e = gkEra(y, m, d);
  return `${e.era}${e.year === 1 ? "元" : e.year}年`;
}

// 小学校に入学する年(西暦)
function gkFirstGradeYear(y, m, d) {
  return (m < 4 || (m === 4 && d === 1)) ? y + 6 : y + 7;
}

const GK_LAST = {
  chugaku: { label: "中学校", kind: "chu" },
  koko: { label: "高等学校", kind: "ko" },
  kosen: { label: "高等専門学校", kind: "kosen", years: 5 },
  senmon2: { label: "専門学校(2年制)", kind: "next", years: 2, school: "専門学校" },
  senmon3: { label: "専門学校(3年制)", kind: "next", years: 3, school: "専門学校" },
  tandai: { label: "短期大学(2年制)", kind: "next", years: 2, school: "短期大学" },
  daigaku4: { label: "大学(4年制)", kind: "next", years: 4, school: "大学" },
  daigaku6: { label: "大学(6年制)", kind: "next", years: 6, school: "大学" },
  shushi: { label: "大学院 修士課程まで", kind: "next", years: 4, school: "大学", grad: 2 },
  hakushi: { label: "大学院 博士課程まで", kind: "next", years: 4, school: "大学", grad: 2, doctor: 3 },
};

/*
 * input = { y, m, d, last, from("sho"|"chu"|"ko"), ronin, ryunen, names: { sho, chu, ko, next, grad } }
 * 戻り値 rows = [{ year, month, text, event }] を古い順に。today(YYYYMMDD の数)より後の行は「見込み・予定」にする
 */
function gkBuild(input, todayNum) {
  const def = GK_LAST[input.last];
  const n = input.names || {};
  const nm = (key, fallback) => (n[key] && n[key].trim() ? n[key].trim() : fallback);
  const E = gkFirstGradeYear(input.y, input.m, input.d);
  const rows = [];
  const add = (year, month, name, ev) => {
    const later = year * 10000 + month * 100 + (month === 3 ? 31 : 1) > todayNum;
    const word = !later ? ev : (ev === "入学" ? "入学予定" : `${ev}見込み`);
    rows.push({ year, month, name, event: word, text: `${name} ${word}` });
  };
  const sho = nm("sho", "○○小学校"), chu = nm("chu", "○○中学校"), ko = nm("ko", "○○高等学校");
  const from = input.from || "ko";
  if (from === "sho") { add(E, 4, sho, "入学"); add(E + 6, 3, sho, "卒業"); }
  if (from === "sho" || from === "chu") add(E + 6, 4, chu, "入学");
  add(E + 9, 3, chu, "卒業");
  if (def.kind === "chu") return { rows, firstGrade: E };
  const rn = Number(input.ronin) || 0, ry = Number(input.ryunen) || 0;
  if (def.kind === "kosen") {
    const school = nm("next", "○○工業高等専門学校");
    add(E + 9, 4, school, "入学");
    add(E + 9 + def.years + ry, 3, school, "卒業");
    return { rows, firstGrade: E };
  }
  add(E + 9, 4, ko, "入学");
  if (def.kind === "ko") { add(E + 12 + ry, 3, ko, "卒業"); return { rows, firstGrade: E }; }
  add(E + 12, 3, ko, "卒業");
  const school = nm("next", `○○${def.school}`);
  const inYear = E + 12 + rn;
  add(inYear, 4, school, "入学");
  const outYear = inYear + def.years + (def.grad ? 0 : ry);
  add(outYear, 3, school, "卒業");
  if (def.grad) {
    const g = nm("grad", "○○大学大学院");
    add(outYear, 4, `${g} 修士課程`, "入学");
    const shu = outYear + def.grad + (def.doctor ? 0 : ry);
    add(shu, 3, `${g} 修士課程`, "修了");
    if (def.doctor) {
      add(shu, 4, `${g} 博士課程`, "入学");
      add(shu + def.doctor + ry, 3, `${g} 博士課程`, "修了");
    }
  }
  return { rows, firstGrade: E };
}

function gkAge(y, m, d, ty, tm, td) {
  return ty - y - ((tm < m || (tm === m && td < d)) ? 1 : 0);
}

/* ---------- 画面 ---------- */
if (typeof document !== "undefined") {
  (function () {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; };
    let lastText = "";
    const yearText = (r, style) => (style === "seireki" ? `${r.year}年` : gkEraYear(r.year, r.month));

    function render(e) {
      if (e) e.preventDefault();
      const err = $("gk-error"), out = $("gk-result");
      const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec($("gk-birth").value);
      let msg = "";
      if (!mt) msg = "生年月日を入れてください。";
      else if (+mt[1] < 1940) msg = "1940年以降の生まれで計算できます。";
      const now = new Date();
      const todayNum = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      if (!msg && +mt[1] * 10000 + +mt[2] * 100 + +mt[3] > todayNum) msg = "生年月日が未来になっています。";
      err.textContent = msg; err.hidden = !msg;
      if (msg) { out.hidden = true; return; }
      const y = +mt[1], m = +mt[2], d = +mt[3];
      const input = {
        y, m, d, last: $("gk-last").value, from: $("gk-from").value, ronin: +$("gk-ronin").value, ryunen: +$("gk-ryunen").value,
        names: { sho: $("gk-sho").value, chu: $("gk-chu").value, ko: $("gk-ko").value, next: $("gk-next").value, grad: $("gk-grad").value },
      };
      const style = document.querySelector('input[name="gk-style"]:checked').value;
      const r = gkBuild(input, todayNum);
      const rows = r.rows.map((x) => `<tr><td>${yearText(x, style)}</td><td>${x.month}</td><td>${esc(x.text)}</td></tr>`).join("");
      const age = gkAge(y, m, d, now.getFullYear(), now.getMonth() + 1, now.getDate());
      const born = style === "seireki" ? `${y}年${m}月${d}日` : `${gkEraYear(y, m, d)}${m}月${d}日`;
      const early = (m < 4 || (m === 4 && d === 1));
      const gw = gkEra(r.firstGrade, 4);
      $("gk-table").innerHTML = rows;
      $("gk-note").textContent = `${born}生まれ(今日で満${age}歳)。${early ? "早生まれなので、" : ""}小学校の入学は${style === "seireki" ? r.firstGrade + "年" : gkEraYear(r.firstGrade, 4)}4月です。`;
      lastText = r.rows.map((x) => `${yearText(x, style)}\t${x.month}\t${x.text}`).join("\n");
      out.hidden = false;
      $("gk-copy").textContent = "コピーする";
      return gw;
    }

    function toggleFields() {
      const def = GK_LAST[$("gk-last").value];
      const from = $("gk-from").value;
      $("gk-w-sho").hidden = from !== "sho";
      $("gk-w-chu").hidden = false;
      $("gk-w-ko").hidden = def.kind === "chu" || def.kind === "kosen";
      $("gk-w-next").hidden = def.kind === "chu" || def.kind === "ko";
      $("gk-w-grad").hidden = !def.grad;
      $("gk-w-ronin").hidden = def.kind !== "next";
      $("gk-w-ryunen").hidden = def.kind === "chu";
    }

    function init() {
      const lastSel = $("gk-last");
      Object.keys(GK_LAST).forEach((k) => lastSel.appendChild(new Option(GK_LAST[k].label, k)));
      lastSel.value = "daigaku4";
      for (const id of ["gk-ronin", "gk-ryunen"]) for (let i = 0; i <= 6; i++) $(id).appendChild(new Option(i === 0 ? "なし" : `${i}年`, i));
      lastSel.addEventListener("change", toggleFields);
      $("gk-from").addEventListener("change", toggleFields);
      toggleFields();
      $("gk-form").addEventListener("submit", (e) => { render(e); const out = $("gk-result"); if (!out.hidden) out.scrollIntoView({ behavior: "smooth", block: "start" }); });
      document.querySelectorAll('input[name="gk-style"]').forEach((el) => el.addEventListener("change", () => { if (!$("gk-result").hidden) render(); }));
      $("gk-copy").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(lastText); $("gk-copy").textContent = "コピーしました"; }
        catch (e) { $("gk-copy").textContent = "コピーできませんでした"; }
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  })();
}
