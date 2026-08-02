/*
 * フォームの入力受付・DOM描画。生成ロジックは generate.js に委譲する。
 */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

const form = document.getElementById("gen-form");
const reasonSelect = document.getElementById("reason_preset");
const reasonCustomField = document.getElementById("reason-custom-field");
const resultSection = document.getElementById("screen-result");
const introSection = document.getElementById("screen-intro");
const resultBody = document.getElementById("result-body");
const btnRestart = document.getElementById("btn-restart");
const btnCopy = document.getElementById("btn-copy");
let generatedText = "";

function toggleReasonCustomField() {
  reasonCustomField.hidden = reasonSelect.value !== "custom";
}
reasonSelect.addEventListener("change", toggleReasonCustomField);
toggleReasonCustomField();

function buildCrossLinkBanners() {
  const banners = [
    { href: "../retirement-simulator/", text: "退職金の手取り額も計算してみる →" },
    { href: "../career-checker/", text: "退職を切り出しにくい方は転職エージェント診断もチェック →" },
    { href: "../insurance-checker/", text: "退職後の保障を保険診断で確認する →" },
  ];
  return banners.map((b) => `<a class="cross-link-banner" href="${escapeHtml(b.href)}">${escapeHtml(b.text)}</a>`).join("");
}

function buildResultHtml(text) {
  return `
    <div class="result-headline">
      <p class="result-headline__label">生成された文面</p>
    </div>
    <pre class="letter-preview">${escapeHtml(text)}</pre>
    <div class="result-cross-links">
      ${buildCrossLinkBanners()}
    </div>
  `;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const letterType = formData.get("letter_type");
  const name = formData.get("name");
  const department = formData.get("department");
  const resignDate = formData.get("resign_date");
  const companyName = formData.get("company_name");
  const representativeName = formData.get("representative_name");
  const reasonPreset = formData.get("reason_preset");
  const reasonCustom = formData.get("reason_custom");

  if (!name || !resignDate || !companyName) {
    return;
  }

  const reasonClause = reasonPreset === "custom" ? reasonCustom : reasonPreset;

  generatedText = buildLetterText({
    letterType,
    name,
    department,
    resignDate,
    companyName,
    representativeName,
    reasonClause,
  });

  resultBody.innerHTML = buildResultHtml(generatedText);
  introSection.hidden = true;
  resultSection.hidden = false;
});

btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(generatedText);
    btnCopy.textContent = "コピーしました";
    setTimeout(() => {
      btnCopy.textContent = "文面をコピーする";
    }, 2000);
  } catch (err) {
    btnCopy.textContent = "コピーに失敗しました。手動で選択してください";
  }
});

btnRestart.addEventListener("click", () => {
  resultSection.hidden = true;
  introSection.hidden = false;
});
