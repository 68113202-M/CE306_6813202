// ============================================================
// เครื่องมือแปลงสกุลเงิน
// - แปลงค่าแบบสองทิศทาง (amount-one <-> amount-two)
// - ประวัติการแปลงเงินย้อนหลัง 10 รายการล่าสุด
// - ปุ่มล้างข้อมูล (reset input + ข้อความอัตราแลกเปลี่ยน)
// - แสดงเวลาที่อัปเดตล่าสุด
// ============================================================

// อัตราแลกเปลี่ยนอ้างอิง (จำนวนหน่วยสกุลเงินต่อ 1 USD)
// หมายเหตุ: เป็นอัตราตัวอย่างแบบคงที่สำหรับสาธิตการทำงาน
// หากต้องการอัตราจริงแบบเรียลไทม์ ควรเชื่อมต่อกับ API อัตราแลกเปลี่ยนภายนอก
const EXCHANGE_RATES = {
  USD: 1,
  THB: 35.50,
  EUR: 0.92,
  JPY: 149.50,
  GBP: 0.79,
  SGD: 1.34,
  CNY: 7.24,
};

const CURRENCY_LABELS = {
  USD: "USD - ดอลลาร์สหรัฐ",
  THB: "THB - บาทไทย",
  EUR: "EUR - ยูโร",
  JPY: "JPY - เยนญี่ปุ่น",
  GBP: "GBP - ปอนด์สเตอร์ลิง",
  SGD: "SGD - ดอลลาร์สิงคโปร์",
  CNY: "CNY - หยวนจีน",
};

const MAX_HISTORY = 10;
const DEFAULT_FROM = "THB";
const DEFAULT_TO = "USD";

// เก็บประวัติไว้ในหน่วยความจำ (ไม่ persist ข้ามการโหลดหน้าใหม่)
let historyList = [];

// จำว่าผู้ใช้พิมพ์แก้ไขช่องไหนล่าสุด ("one" หรือ "two")
// ใช้ตอนกดปุ่ม "แปลงค่า" เพื่อรู้ทิศทางการคำนวณ
let lastEditedField = "one";

// ---------- DOM references ----------
const currencyOneSelect = document.getElementById("currency-one");
const currencyTwoSelect = document.getElementById("currency-two");
const amountOneInput = document.getElementById("amount-one");
const amountTwoInput = document.getElementById("amount-two");
const rateText = document.getElementById("rate-text");
const updatedTimeText = document.getElementById("updated-time");
const convertBtn = document.getElementById("convert-btn");
const clearBtn = document.getElementById("clear-btn");
const swapBtn = document.getElementById("swap-btn");
const historyUl = document.getElementById("history-list");
const emptyHistoryEl = document.getElementById("empty-history");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// ---------- Init selects ----------
function populateCurrencySelects() {
  Object.keys(EXCHANGE_RATES).forEach((code) => {
    const opt1 = document.createElement("option");
    opt1.value = code;
    opt1.textContent = CURRENCY_LABELS[code] || code;
    currencyOneSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = code;
    opt2.textContent = CURRENCY_LABELS[code] || code;
    currencyTwoSelect.appendChild(opt2);
  });
  currencyOneSelect.value = DEFAULT_FROM;
  currencyTwoSelect.value = DEFAULT_TO;
}

// ---------- Conversion helpers ----------
function toUSD(amount, currency) {
  return amount / EXCHANGE_RATES[currency];
}

function fromUSD(amountUSD, currency) {
  return amountUSD * EXCHANGE_RATES[currency];
}

function convert(amount, fromCurrency, toCurrency) {
  const usd = toUSD(amount, fromCurrency);
  return fromUSD(usd, toCurrency);
}

function getPairRate(fromCurrency, toCurrency) {
  return convert(1, fromCurrency, toCurrency);
}

function formatNumber(num) {
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

// ---------- Rate text & time ----------
function updateRateText() {
  const from = currencyOneSelect.value;
  const to = currencyTwoSelect.value;
  const rate = getPairRate(from, to);
  rateText.textContent = `อัตราแลกเปลี่ยน: 1 ${from} = ${formatNumber(rate)} ${to}`;
}

function updateTimestamp() {
  const now = new Date();
  const formatted = now.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  updatedTimeText.textContent = `อัปเดตล่าสุด: ${formatted}`;
}

// ---------- History ----------
function addHistoryEntry(fromAmount, fromCurrency, toAmount, toCurrency) {
  if (!fromAmount || !toAmount || Number.isNaN(fromAmount) || Number.isNaN(toAmount)) {
    return;
  }
  const entry = {
    fromAmount,
    fromCurrency,
    toAmount,
    toCurrency,
    time: new Date(),
  };
  historyList.unshift(entry);
  if (historyList.length > MAX_HISTORY) {
    historyList = historyList.slice(0, MAX_HISTORY);
  }
  renderHistory();
}

function renderHistory() {
  historyUl.innerHTML = "";
  if (historyList.length === 0) {
    emptyHistoryEl.style.display = "block";
    return;
  }
  emptyHistoryEl.style.display = "none";

  historyList.forEach((entry) => {
    const li = document.createElement("li");

    const mainSpan = document.createElement("span");
    mainSpan.className = "h-main";
    mainSpan.textContent = `${formatNumber(entry.fromAmount)} ${entry.fromCurrency} → ${formatNumber(entry.toAmount)} ${entry.toCurrency}`;

    const timeSpan = document.createElement("span");
    timeSpan.className = "h-time";
    timeSpan.textContent = entry.time.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    li.appendChild(mainSpan);
    li.appendChild(timeSpan);
    historyUl.appendChild(li);
  });
}

function clearHistory() {
  historyList = [];
  renderHistory();
}

// ---------- Core conversion handlers (bidirectional) ----------
// ทำงานเมื่อกดปุ่ม "แปลงค่า" เท่านั้น (ไม่แปลงอัตโนมัติทุกครั้งที่พิมพ์)
// เพื่อไม่ให้เพิ่มประวัติถี่เกินไป
function convertOneToTwo() {
  const from = currencyOneSelect.value;
  const to = currencyTwoSelect.value;
  const amount = parseFloat(amountOneInput.value);

  if (Number.isNaN(amount)) {
    amountTwoInput.value = "";
    updateRateText();
    return;
  }

  const result = convert(amount, from, to);
  amountTwoInput.value = result.toFixed(2);

  updateRateText();
  updateTimestamp();
  addHistoryEntry(amount, from, result, to);
}

function convertTwoToOne() {
  const from = currencyOneSelect.value;
  const to = currencyTwoSelect.value;
  const amount = parseFloat(amountTwoInput.value);

  if (Number.isNaN(amount)) {
    amountOneInput.value = "";
    updateRateText();
    return;
  }

  // แปลงย้อนกลับ: จากช่องปลายทาง (to) กลับไปยังช่องต้นทาง (from)
  const result = convert(amount, to, from);
  amountOneInput.value = result.toFixed(2);

  updateRateText();
  updateTimestamp();
  addHistoryEntry(result, from, amount, to);
}

// กดปุ่ม "แปลงค่า" -> ใช้ field ที่ผู้ใช้แก้ไขล่าสุดเป็นตัวตั้งต้น
function handleConvertClick() {
  if (lastEditedField === "two" && amountTwoInput.value !== "") {
    convertTwoToOne();
  } else if (amountOneInput.value !== "") {
    convertOneToTwo();
  } else if (amountTwoInput.value !== "") {
    convertTwoToOne();
  }
}

// แค่จำว่าผู้ใช้กำลังพิมพ์ช่องไหน ไม่คำนวณและไม่เก็บ log ทันที
function handleAmountOneInput() {
  lastEditedField = "one";
}

function handleAmountTwoInput() {
  lastEditedField = "two";
}

// เปลี่ยนสกุลเงิน แค่อัปเดตข้อความอัตราแลกเปลี่ยนแบบพรีวิว ไม่เก็บ log
function handleCurrencyChange() {
  updateRateText();
}

function swapCurrencies() {
  const temp = currencyOneSelect.value;
  currencyOneSelect.value = currencyTwoSelect.value;
  currencyTwoSelect.value = temp;
  updateRateText();
}

// ---------- Clear inputs (โจทย์ที่ 3) ----------
function clearInputs() {
  amountOneInput.value = "";
  amountTwoInput.value = "";
  currencyOneSelect.value = DEFAULT_FROM;
  currencyTwoSelect.value = DEFAULT_TO;
  rateText.textContent = "อัตราแลกเปลี่ยน: ยังไม่มีการคำนวณ";
  updatedTimeText.textContent = "อัปเดตล่าสุด: -";
}

// ---------- Event bindings ----------
amountOneInput.addEventListener("input", handleAmountOneInput);
amountTwoInput.addEventListener("input", handleAmountTwoInput);
currencyOneSelect.addEventListener("change", handleCurrencyChange);
currencyTwoSelect.addEventListener("change", handleCurrencyChange);
swapBtn.addEventListener("click", swapCurrencies);
convertBtn.addEventListener("click", handleConvertClick);
clearBtn.addEventListener("click", clearInputs);
clearHistoryBtn.addEventListener("click", clearHistory);

// กด Enter ในช่อง input ก็แปลงค่าได้เลย
amountOneInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleConvertClick();
});
amountTwoInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleConvertClick();
});

// ---------- Init ----------
populateCurrencySelects();
updateRateText();
renderHistory();
