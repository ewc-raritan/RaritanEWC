const PIZZA_HOT_API_URL = "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=PIZZA_HOT";

const pizzaElements = {};

document.addEventListener("DOMContentLoaded", () => {
    pizzaElements.grid = document.querySelector("#pizza-card-grid");
    pizzaElements.loading = document.querySelector("#pizza-loading");
    pizzaElements.error = document.querySelector("#pizza-error");
    pizzaElements.empty = document.querySelector("#pizza-empty");
    pizzaElements.count = document.querySelector("#pizza-result-count");
    pizzaElements.reload = document.querySelector("#pizza-reload");

    pizzaElements.reload.addEventListener("click", loadPizzaOffers);
    loadPizzaOffers();
});

async function loadPizzaOffers() {
    setPizzaState("loading");

    try {
        const response = await fetch(PIZZA_HOT_API_URL, {
            method: "GET",
            redirect: "follow",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("API response is not an array");
        }

        const offers = data.filter(isValidPizzaOffer);
        renderPizzaOffers(offers);
    } catch (error) {
        console.error("Pizza Hot API 載入失敗：", {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        setPizzaState("error");
    }
}

function isValidPizzaOffer(offer) {
    return offer && typeof offer === "object" && offer.code && offer.detail;
}

function renderPizzaOffers(offers) {
    pizzaElements.grid.replaceChildren();

    if (offers.length === 0) {
        setPizzaState("empty");
        return;
    }

    const fragment = document.createDocumentFragment();

    offers.forEach((offer) => {
        const card = document.createElement("article");
        card.className = "pizza-card";

        const code = document.createElement("p");
        code.className = "pizza-card__code";
        code.textContent = `優惠代碼 ${String(offer.code)}`;

        const detail = document.createElement("p");
        detail.className = "pizza-card__detail";
        detail.textContent = String(offer.detail);

        const endDate = document.createElement("p");
        endDate.className = "pizza-card__date";
        endDate.textContent = offer.endDate
            ? `優惠截止日期：${formatPizzaDate(offer.endDate)}`
            : "優惠截止日期：未提供";

        card.append(code, detail, endDate);
        fragment.append(card);
    });

    pizzaElements.grid.append(fragment);
    pizzaElements.count.textContent = `目前共有 ${offers.length} 組優惠`;
    setPizzaState("success");
}

function formatPizzaDate(value) {
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : String(value);
}

function setPizzaState(state) {
    pizzaElements.loading.hidden = state !== "loading";
    pizzaElements.error.hidden = state !== "error";
    pizzaElements.empty.hidden = state !== "empty";
    pizzaElements.reload.hidden = state !== "error";

    if (state === "loading") {
        pizzaElements.grid.replaceChildren();
        pizzaElements.count.textContent = "正在取得優惠資料...";
    }

    if (state === "error") {
        pizzaElements.grid.replaceChildren();
        pizzaElements.count.textContent = "優惠資料載入失敗";
    }

    if (state === "empty") {
        pizzaElements.count.textContent = "目前沒有優惠資料";
    }
}
