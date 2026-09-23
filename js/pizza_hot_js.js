const PIZZA_HOT_API_URL =
    "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=PIZZA_HOT";

const PIZZA_HOT_API_URL_BK =
    "https://script.google.com/macros/s/AKfycbzApcrcbGcv5sM6o857xlJXzqp_yFg18VPKIVOShRzCeRouhqrK3Q5tgMHG3yXqZN91Pw/exec?api=PIZZA_HOT";

const PIZZA_HOT_CACHE_KEY = "pizza_hot_cache";

const PIZZA_HOT_CACHE_TIME_KEY = "pizza_hot_cache_time";

const PIZZA_HOT_CACHE_DURATION = 60 * 60 * 1000;

const PIZZA_HOT_RETRY_DELAY = 1000;

const PIZZA_HOT_LOADING_IMAGE = "assets/icon/loading.webp";

const pizzaElements = {};

let allPizzaOffers = [];

document.addEventListener(
    "DOMContentLoaded",
    () => {
        pizzaElements.search =
            document.querySelector(
                "#pizza-search"
            );

        pizzaElements.grid =
            document.querySelector(
                "#pizza-card-grid"
            );

        pizzaElements.loading =
            document.querySelector(
                "#pizza-loading"
            );

        pizzaElements.error =
            document.querySelector(
                "#pizza-error"
            );

        pizzaElements.empty =
            document.querySelector(
                "#pizza-empty"
            );

        pizzaElements.count =
            document.querySelector(
                "#pizza-result-count"
            );

        pizzaElements.reload =
            document.querySelector(
                "#pizza-reload"
            );

        createPizzaLoadingContent();

        pizzaElements.search
            .addEventListener(
                "input",
                filterPizzaOffers
            );

        pizzaElements.reload
            .addEventListener(
                "click",
                handlePizzaReload
            );

        loadPizzaOffers();
    }
);

function handlePizzaReload() {
    clearPizzaCache();

    loadPizzaOffers(true);
}

async function loadPizzaOffers(
    forceRefresh = false
) {
    setPizzaLoadingText(
        "正在取得優惠資料..."
    );

    setPizzaState("loading");

    try {
        if (!forceRefresh) {
            const cachedOffers =
                getValidPizzaCache();

            if (cachedOffers !== null) {
                console.log(
                    "Pizza Hot 使用本機快取資料"
                );

                allPizzaOffers =
                    cachedOffers.filter(
                        isValidPizzaOffer
                    );

                renderPizzaOffers(
                    allPizzaOffers,
                    false
                );

                return;
            }
        }

        const data =
            await fetchPizzaDataWithBackup();

        if (data.length > 0) {
            savePizzaCache(data);
        } else {
            clearPizzaCache();
        }

        allPizzaOffers =
            data.filter(
                isValidPizzaOffer
            );

        renderPizzaOffers(
            allPizzaOffers,
            false
        );
    } catch (error) {
        console.error(
            "Pizza Hot API 四次連線皆失敗：",
            error
        );

        setPizzaState("error");
    }
}

async function fetchPizzaDataWithBackup() {
    let lastError = null;

    try {
        setPizzaLoadingText(
            "正在取得優惠資料..."
        );

        return await fetchPizzaApi(
            PIZZA_HOT_API_URL,
            "Pizza Hot 主要 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "Pizza Hot 主要 API 第一次連線失敗：",
            error
        );
    }

    setPizzaLoadingText(
        "第二次連線嘗試..."
    );

    await waitPizzaRetry(
        PIZZA_HOT_RETRY_DELAY
    );

    try {
        return await fetchPizzaApi(
            PIZZA_HOT_API_URL,
            "Pizza Hot 主要 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "Pizza Hot 主要 API 第二次連線失敗：",
            error
        );
    }

    setPizzaLoadingText(
        "第三次連線嘗試..."
    );

    await waitPizzaRetry(
        PIZZA_HOT_RETRY_DELAY
    );

    try {
        return await fetchPizzaApi(
            PIZZA_HOT_API_URL_BK,
            "Pizza Hot 備援 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "Pizza Hot 備援 API 第一次連線失敗：",
            error
        );
    }

    setPizzaLoadingText(
        "第四次連線嘗試..."
    );

    await waitPizzaRetry(
        PIZZA_HOT_RETRY_DELAY
    );

    try {
        return await fetchPizzaApi(
            PIZZA_HOT_API_URL_BK,
            "Pizza Hot 備援 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "Pizza Hot 備援 API 第二次連線失敗：",
            error
        );
    }

    throw (
        lastError ||
        new Error(
            "Pizza Hot API 連線失敗"
        )
    );
}

async function fetchPizzaApi(
    apiUrl,
    label
) {
    console.log(
        `${label}：${apiUrl}`
    );

    const response =
        await fetch(
            apiUrl,
            {
                method: "GET",
                redirect: "follow",
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `${label} HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {
        throw new Error(
            `${label}回傳格式不是陣列`
        );
    }

    return data;
}

function getValidPizzaCache() {
    const cachedData =
        localStorage.getItem(
            PIZZA_HOT_CACHE_KEY
        );

    const cachedTime =
        localStorage.getItem(
            PIZZA_HOT_CACHE_TIME_KEY
        );

    if (!cachedData || !cachedTime) {
        return null;
    }

    const cacheAge =
        Date.now() -
        Number(cachedTime);

    if (
        !Number.isFinite(cacheAge) ||
        cacheAge < 0 ||
        cacheAge >= PIZZA_HOT_CACHE_DURATION
    ) {
        clearPizzaCache();

        return null;
    }

    try {
        const parsedData =
            JSON.parse(cachedData);

        if (
            !Array.isArray(parsedData) ||
            parsedData.length === 0
        ) {
            console.log(
                "Pizza Hot 本機快取為空，重新呼叫 API"
            );

            clearPizzaCache();

            return null;
        }

        return parsedData;
    } catch (error) {
        console.warn(
            "Pizza Hot 本機快取無法解析，重新呼叫 API：",
            error
        );

        clearPizzaCache();

        return null;
    }
}

function savePizzaCache(data) {
    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        clearPizzaCache();

        return;
    }

    try {
        localStorage.setItem(
            PIZZA_HOT_CACHE_KEY,
            JSON.stringify(data)
        );

        localStorage.setItem(
            PIZZA_HOT_CACHE_TIME_KEY,
            String(Date.now())
        );
    } catch (error) {
        console.warn(
            "Pizza Hot 本機快取寫入失敗：",
            error
        );
    }
}

function clearPizzaCache() {
    localStorage.removeItem(
        PIZZA_HOT_CACHE_KEY
    );

    localStorage.removeItem(
        PIZZA_HOT_CACHE_TIME_KEY
    );
}

function createPizzaLoadingContent() {
    if (!pizzaElements.loading) {
        return;
    }

    pizzaElements.loading
        .replaceChildren();

    const loadingImage =
        document.createElement("img");

    loadingImage.src =
        PIZZA_HOT_LOADING_IMAGE;

    loadingImage.alt = "";

    loadingImage.className =
        "pizza-loading__image";

    loadingImage.setAttribute(
        "aria-hidden",
        "true"
    );

    const loadingText =
        document.createElement("span");

    loadingText.className =
        "pizza-loading__text";

    loadingText.textContent =
        "正在取得優惠資料...";

    pizzaElements.loading.append(
        loadingImage,
        loadingText
    );

    pizzaElements.loading.setAttribute(
        "role",
        "status"
    );

    pizzaElements.loading.setAttribute(
        "aria-live",
        "polite"
    );

    pizzaElements.loadingText =
        loadingText;
}

function setPizzaLoadingText(text) {
    if (!pizzaElements.loadingText) {
        createPizzaLoadingContent();
    }

    if (pizzaElements.loadingText) {
        pizzaElements
            .loadingText
            .textContent = text;
    }

    if (
        pizzaElements.count &&
        !pizzaElements.loading?.hidden
    ) {
        pizzaElements
            .count
            .textContent = text;
    }
}

function waitPizzaRetry(milliseconds) {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function isValidPizzaOffer(offer) {
    return (
        offer &&
        typeof offer === "object" &&
        Boolean(offer.code) &&
        Boolean(offer.detail)
    );
}

function filterPizzaOffers() {
    const keyword =
        pizzaElements.search
            .value
            .trim()
            .toLocaleLowerCase(
                "zh-Hant-TW"
            );

    if (!keyword) {
        renderPizzaOffers(
            allPizzaOffers,
            false
        );

        return;
    }

    const filteredOffers =
        allPizzaOffers.filter(
            (offer) =>
                String(offer.detail)
                    .toLocaleLowerCase(
                        "zh-Hant-TW"
                    )
                    .includes(keyword)
        );

    renderPizzaOffers(
        filteredOffers,
        true
    );
}

function renderPizzaOffers(
    offers,
    isSearchResult
) {
    pizzaElements.grid
        .replaceChildren();

    if (offers.length === 0) {
        pizzaElements
            .count
            .textContent =
            isSearchResult
                ? "找不到符合條件的優惠"
                : "目前沒有優惠資料";

        setPizzaState("empty");

        return;
    }

    const fragment =
        document.createDocumentFragment();

    offers.forEach(
        (offer) => {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "pizza-card";

            const code =
                document.createElement(
                    "p"
                );

            code.className =
                "pizza-card__code";

            code.textContent =
                `優惠代碼 ${String(offer.code)}`;

            const detail =
                document.createElement(
                    "p"
                );

            detail.className =
                "pizza-card__detail";

            detail.textContent =
                String(offer.detail);

            const endDate =
                document.createElement(
                    "p"
                );

            endDate.className =
                "pizza-card__date";

            endDate.textContent =
                offer.endDate
                    ? `優惠截止日期：${formatPizzaDate(offer.endDate)}`
                    : "優惠截止日期：未提供";

            card.append(
                code,
                detail,
                endDate
            );

            fragment.append(card);
        }
    );

    pizzaElements.grid.append(
        fragment
    );

    pizzaElements
        .count
        .textContent =
        isSearchResult
            ? `找到 ${offers.length} 組優惠`
            : `目前共有 ${offers.length} 組優惠`;

    setPizzaState("success");
}

function formatPizzaDate(value) {
    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    return match
        ? `${match[1]}/${match[2]}/${match[3]}`
        : String(value);
}

function setPizzaState(state) {
    pizzaElements.loading.hidden =
        state !== "loading";

    pizzaElements.error.hidden =
        state !== "error";

    pizzaElements.empty.hidden =
        state !== "empty";

    pizzaElements.reload.hidden =
        state !== "error";

    const controlsDisabled =
        state === "loading" ||
        state === "error";

    pizzaElements.search.disabled =
        controlsDisabled;

    if (state === "loading") {
        pizzaElements.grid
            .replaceChildren();

        if (pizzaElements.loadingText) {
            pizzaElements
                .count
                .textContent =
                pizzaElements
                    .loadingText
                    .textContent;
        } else {
            pizzaElements
                .count
                .textContent =
                "正在取得優惠資料...";
        }
    }

    if (state === "error") {
        pizzaElements.grid
            .replaceChildren();

        pizzaElements
            .count
            .textContent =
            "優惠資料載入失敗";
    }
}