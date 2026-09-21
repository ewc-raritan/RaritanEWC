const KFC_BREAKFAST_API_URL = "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=KFC_BREAKFAST";

const kfcBreakfastElements = {};
let kfcBreakfastOffers = [];

document.addEventListener("DOMContentLoaded", () => {
  kfcBreakfastElements.search = document.querySelector("#kfc-breakfast-search");
  kfcBreakfastElements.grid = document.querySelector("#kfc-breakfast-card-grid");
  kfcBreakfastElements.loading = document.querySelector("#kfc-breakfast-loading");
  kfcBreakfastElements.error = document.querySelector("#kfc-breakfast-error");
  kfcBreakfastElements.empty = document.querySelector("#kfc-breakfast-empty");
  kfcBreakfastElements.count = document.querySelector("#kfc-breakfast-result-count");
  kfcBreakfastElements.reload = document.querySelector("#kfc-breakfast-reload");

  kfcBreakfastElements.search.addEventListener("input", filterKfcBreakfastOffers);
  kfcBreakfastElements.reload.addEventListener("click", loadKfcBreakfastOffers);

  loadKfcBreakfastOffers();
});

async function loadKfcBreakfastOffers() {
  setKfcBreakfastState("loading");

  try {
    const response = await fetch(KFC_BREAKFAST_API_URL, {
      method: "GET",
      redirect: "follow",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("API 回傳格式不是陣列");
    }

    kfcBreakfastOffers = data.filter(isValidKfcBreakfastOffer);
    renderKfcBreakfastOffers(kfcBreakfastOffers, false);
  } catch (error) {
    console.error("KFC 早餐優惠 API 載入失敗：", error);
    setKfcBreakfastState("error");
  }
}

function isValidKfcBreakfastOffer(offer) {
  return offer && typeof offer === "object" && offer.code && offer.detail;
}

function filterKfcBreakfastOffers() {
  const keyword = kfcBreakfastElements.search.value.trim().toLocaleLowerCase("zh-Hant-TW");

  if (!keyword) {
    renderKfcBreakfastOffers(kfcBreakfastOffers, false);
    return;
  }

  const filteredOffers = kfcBreakfastOffers.filter((offer) =>
    String(offer.detail).toLocaleLowerCase("zh-Hant-TW").includes(keyword)
  );

  renderKfcBreakfastOffers(filteredOffers, true);
}

function renderKfcBreakfastOffers(offers, isSearchResult) {
  kfcBreakfastElements.grid.replaceChildren();

  if (offers.length === 0) {
    kfcBreakfastElements.count.textContent = isSearchResult
      ? "找不到符合條件的優惠"
      : "目前沒有優惠資料";
    setKfcBreakfastState("empty");
    return;
  }

  const fragment = document.createDocumentFragment();

  offers.forEach((offer) => {
    const card = document.createElement("article");
    card.className = "kfc-breakfast-card";

    const code = document.createElement("p");
    code.className = "kfc-breakfast-card__code";
    code.textContent = `優惠代碼 ${String(offer.code)}`;

    const detail = document.createElement("p");
    detail.className = "kfc-breakfast-card__detail";
    detail.textContent = String(offer.detail);

    const footer = document.createElement("footer");
    footer.className = "kfc-breakfast-card__footer";

    const discountText = calculateKfcBreakfastDiscount(
      offer.discountPrice,
      offer.originalPrice
    );

    if (discountText) {
      const discount = document.createElement("p");
      discount.className = "kfc-breakfast-card__discount";
      discount.textContent = discountText;
      footer.append(discount);
    }

    const endDate = document.createElement("p");
    endDate.className = "kfc-breakfast-card__date";
    endDate.textContent = offer.endDate
      ? `優惠截止日期：${formatKfcBreakfastDate(offer.endDate)}`
      : "優惠截止日期：未提供";

    footer.append(endDate);
    card.append(code, detail, footer);
    fragment.append(card);
  });

  kfcBreakfastElements.grid.append(fragment);
  kfcBreakfastElements.count.textContent = isSearchResult
    ? `找到 ${offers.length} 組優惠`
    : `目前共有 ${offers.length} 組優惠`;

  setKfcBreakfastState("success");
}

function calculateKfcBreakfastDiscount(discountPrice, originalPrice) {
  const discount = Number(discountPrice);
  const original = Number(originalPrice);

  if (!Number.isFinite(discount) || !Number.isFinite(original) || original <= 0) {
    return "";
  }

  return `${((discount / original) * 10).toFixed(1)}折`;
}

function formatKfcBreakfastDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : String(value);
}

function setKfcBreakfastState(state) {
  kfcBreakfastElements.loading.hidden = state !== "loading";
  kfcBreakfastElements.error.hidden = state !== "error";
  kfcBreakfastElements.empty.hidden = state !== "empty";

  if (state === "loading") {
    kfcBreakfastElements.grid.replaceChildren();
    kfcBreakfastElements.search.disabled = true;
    kfcBreakfastElements.count.textContent = "正在取得優惠資料...";
  } else {
    kfcBreakfastElements.search.disabled = false;
  }

  if (state === "error") {
    kfcBreakfastElements.grid.replaceChildren();
    kfcBreakfastElements.count.textContent = "優惠資料載入失敗";
  }
}
