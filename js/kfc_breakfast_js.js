const KFC_BREAKFAST_API_URL =
    "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=KFC_BREAKFAST";

const KFC_BREAKFAST_API_URL_BK =
    "https://script.google.com/macros/s/AKfycbzApcrcbGcv5sM6o857xlJXzqp_yFg18VPKIVOShRzCeRouhqrK3Q5tgMHG3yXqZN91Pw/exec?api=KFC_BREAKFAST";

const KFC_BREAKFAST_CACHE_KEY = "kfc_breakfast_cache";

const KFC_BREAKFAST_CACHE_TIME_KEY = "kfc_breakfast_cache_time";

const CACHE_DURATION = 60 * 60 * 1000;

const KFC_BREAKFAST_RETRY_DELAY = 1000;

const KFC_BREAKFAST_LOADING_IMAGE = "assets/icon/loading.webp";

const kfcBreakfastElements = {};

let kfcBreakfastOffers = [];

document.addEventListener(
    "DOMContentLoaded",
    () => {
        kfcBreakfastElements.search =
            document.querySelector(
                "#kfc-breakfast-search"
            );

        kfcBreakfastElements.grid =
            document.querySelector(
                "#kfc-breakfast-card-grid"
            );

        kfcBreakfastElements.loading =
            document.querySelector(
                "#kfc-breakfast-loading"
            );

        kfcBreakfastElements.error =
            document.querySelector(
                "#kfc-breakfast-error"
            );

        kfcBreakfastElements.empty =
            document.querySelector(
                "#kfc-breakfast-empty"
            );

        kfcBreakfastElements.count =
            document.querySelector(
                "#kfc-breakfast-result-count"
            );

        kfcBreakfastElements.reload =
            document.querySelector(
                "#kfc-breakfast-reload"
            );

        createKfcBreakfastLoadingContent();

        kfcBreakfastElements.search
            .addEventListener(
                "input",
                filterKfcBreakfastOffers
            );

        kfcBreakfastElements.reload
            .addEventListener(
                "click",
                handleKfcBreakfastReload
            );

        loadKfcBreakfastOffers();
    }
);

function handleKfcBreakfastReload() {
    clearKfcBreakfastLocalCache();

    loadKfcBreakfastOffers(true);
}

async function loadKfcBreakfastOffers(
    forceRefresh = false
) {
    setKfcBreakfastLoadingText(
        "正在取得優惠資料..."
    );

    setKfcBreakfastState("loading");

    try {
        if (!forceRefresh) {
            const cachedOffers =
                getValidKfcBreakfastCache();

            if (cachedOffers !== null) {
                console.log(
                    "KFC 早餐使用本機快取資料"
                );

                kfcBreakfastOffers =
                    cachedOffers.filter(
                        isValidKfcBreakfastOffer
                    );

                renderKfcBreakfastOffers(
                    kfcBreakfastOffers,
                    false
                );

                return;
            }
        }

        const data =
            await fetchKfcBreakfastDataWithBackup();

        if (data.length > 0) {
            saveKfcBreakfastLocalCache(
                data
            );
        } else {
            clearKfcBreakfastLocalCache();
        }

        kfcBreakfastOffers =
            data.filter(
                isValidKfcBreakfastOffer
            );

        renderKfcBreakfastOffers(
            kfcBreakfastOffers,
            false
        );
    } catch (error) {
        console.error(
            "KFC 早餐優惠 API 四次連線皆失敗：",
            error
        );

        setKfcBreakfastState("error");
    }
}

async function fetchKfcBreakfastDataWithBackup() {
    let lastError = null;

    try {
        setKfcBreakfastLoadingText(
            "正在取得優惠資料..."
        );

        return await fetchKfcBreakfastApi(
            KFC_BREAKFAST_API_URL,
            "KFC 早餐主要 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "KFC 早餐主要 API 第一次連線失敗：",
            error
        );
    }

    setKfcBreakfastLoadingText(
        "第二次連線嘗試..."
    );

    await waitKfcBreakfastRetry(
        KFC_BREAKFAST_RETRY_DELAY
    );

    try {
        return await fetchKfcBreakfastApi(
            KFC_BREAKFAST_API_URL,
            "KFC 早餐主要 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "KFC 早餐主要 API 第二次連線失敗：",
            error
        );
    }

    setKfcBreakfastLoadingText(
        "第三次連線嘗試..."
    );

    await waitKfcBreakfastRetry(
        KFC_BREAKFAST_RETRY_DELAY
    );

    try {
        return await fetchKfcBreakfastApi(
            KFC_BREAKFAST_API_URL_BK,
            "KFC 早餐備援 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "KFC 早餐備援 API 第一次連線失敗：",
            error
        );
    }

    setKfcBreakfastLoadingText(
        "第四次次連線嘗試..."
    );

    await waitKfcBreakfastRetry(
        KFC_BREAKFAST_RETRY_DELAY
    );

    try {
        return await fetchKfcBreakfastApi(
            KFC_BREAKFAST_API_URL_BK,
            "KFC 早餐備援 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "KFC 早餐備援 API 第二次連線失敗：",
            error
        );
    }

    throw (
        lastError ||
        new Error(
            "KFC 早餐優惠 API 連線失敗"
        )
    );
}

async function fetchKfcBreakfastApi(
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

function getValidKfcBreakfastCache() {
    const cachedData =
        localStorage.getItem(
            KFC_BREAKFAST_CACHE_KEY
        );

    const cachedTime =
        localStorage.getItem(
            KFC_BREAKFAST_CACHE_TIME_KEY
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
        cacheAge >= CACHE_DURATION
    ) {
        clearKfcBreakfastLocalCache();

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
                "KFC 早餐本機快取為空，重新呼叫 API"
            );

            clearKfcBreakfastLocalCache();

            return null;
        }

        return parsedData;
    } catch (error) {
        console.warn(
            "KFC 早餐本機快取無法解析，重新呼叫 API：",
            error
        );

        clearKfcBreakfastLocalCache();

        return null;
    }
}

function saveKfcBreakfastLocalCache(
    data
) {
    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        clearKfcBreakfastLocalCache();

        return;
    }

    try {
        localStorage.setItem(
            KFC_BREAKFAST_CACHE_KEY,
            JSON.stringify(data)
        );

        localStorage.setItem(
            KFC_BREAKFAST_CACHE_TIME_KEY,
            String(Date.now())
        );
    } catch (error) {
        console.warn(
            "KFC 早餐本機快取寫入失敗：",
            error
        );
    }
}

function clearKfcBreakfastLocalCache() {
    localStorage.removeItem(
        KFC_BREAKFAST_CACHE_KEY
    );

    localStorage.removeItem(
        KFC_BREAKFAST_CACHE_TIME_KEY
    );
}

function createKfcBreakfastLoadingContent() {
    if (!kfcBreakfastElements.loading) {
        return;
    }

    kfcBreakfastElements.loading
        .replaceChildren();

    const loadingImage =
        document.createElement("img");

    loadingImage.src =
        KFC_BREAKFAST_LOADING_IMAGE;

    loadingImage.alt = "";

    loadingImage.className =
        "kfc-breakfast-loading__image";

    loadingImage.setAttribute(
        "aria-hidden",
        "true"
    );

    const loadingText =
        document.createElement("span");

    loadingText.className =
        "kfc-breakfast-loading__text";

    loadingText.textContent =
        "正在取得優惠資料...";

    kfcBreakfastElements.loading.append(
        loadingImage,
        loadingText
    );

    kfcBreakfastElements.loading
        .setAttribute(
            "role",
            "status"
        );

    kfcBreakfastElements.loading
        .setAttribute(
            "aria-live",
            "polite"
        );

    kfcBreakfastElements.loadingText =
        loadingText;
}

function setKfcBreakfastLoadingText(
    text
) {
    if (
        !kfcBreakfastElements.loadingText
    ) {
        createKfcBreakfastLoadingContent();
    }

    if (
        kfcBreakfastElements.loadingText
    ) {
        kfcBreakfastElements
            .loadingText
            .textContent = text;
    }

    if (
        kfcBreakfastElements.count &&
        !kfcBreakfastElements
            .loading?.hidden
    ) {
        kfcBreakfastElements
            .count
            .textContent = text;
    }
}

function waitKfcBreakfastRetry(
    milliseconds
) {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function isValidKfcBreakfastOffer(
    offer
) {
    return (
        offer &&
        typeof offer === "object" &&
        Boolean(offer.code) &&
        Boolean(offer.detail)
    );
}

function filterKfcBreakfastOffers() {
    const keyword =
        kfcBreakfastElements.search
            .value
            .trim()
            .toLocaleLowerCase(
                "zh-Hant-TW"
            );

    if (!keyword) {
        renderKfcBreakfastOffers(
            kfcBreakfastOffers,
            false
        );

        return;
    }

    const filteredOffers =
        kfcBreakfastOffers.filter(
            (offer) =>
                String(offer.detail)
                    .toLocaleLowerCase(
                        "zh-Hant-TW"
                    )
                    .includes(keyword)
        );

    renderKfcBreakfastOffers(
        filteredOffers,
        true
    );
}

function renderKfcBreakfastOffers(
    offers,
    isSearchResult
) {
    kfcBreakfastElements.grid
        .replaceChildren();

    if (offers.length === 0) {
        kfcBreakfastElements
            .count
            .textContent =
            isSearchResult
                ? "找不到符合條件的優惠"
                : "目前沒有優惠資料";

        setKfcBreakfastState("empty");

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
                "kfc-breakfast-card";

            const code =
                document.createElement(
                    "p"
                );

            code.className =
                "kfc-breakfast-card__code";

            code.textContent =
                `優惠代碼 ${String(offer.code)}`;

            const detail =
                document.createElement(
                    "p"
                );

            detail.className =
                "kfc-breakfast-card__detail";

            detail.textContent =
                String(offer.detail);

            const footer =
                document.createElement(
                    "footer"
                );

            footer.className =
                "kfc-breakfast-card__footer";

            const discountText =
                calculateKfcBreakfastDiscount(
                    offer.discountPrice,
                    offer.originalPrice
                );

            if (discountText) {
                const discount =
                    document.createElement(
                        "p"
                    );

                discount.className =
                    "kfc-breakfast-card__discount";

                discount.textContent =
                    discountText;

                footer.append(discount);
            }

            const endDate =
                document.createElement(
                    "p"
                );

            endDate.className =
                "kfc-breakfast-card__date";

            endDate.textContent =
                offer.endDate
                    ? `優惠截止日期：${formatKfcBreakfastDate(offer.endDate)}`
                    : "優惠截止日期：未提供";

            footer.append(endDate);

            card.append(
                code,
                detail,
                footer
            );

            fragment.append(card);
        }
    );

    kfcBreakfastElements.grid.append(
        fragment
    );

    kfcBreakfastElements
        .count
        .textContent =
        isSearchResult
            ? `找到 ${offers.length} 組優惠`
            : `目前共有 ${offers.length} 組優惠`;

    setKfcBreakfastState("success");
}

function calculateKfcBreakfastDiscount(
    discountPrice,
    originalPrice
) {
    const discount =
        Number(discountPrice);

    const original =
        Number(originalPrice);

    if (
        !Number.isFinite(discount) ||
        !Number.isFinite(original) ||
        original <= 0
    ) {
        return "";
    }

    return (
        `${(
            (discount / original) *
            10
        ).toFixed(1)}折`
    );
}

function formatKfcBreakfastDate(value) {
    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    return match
        ? `${match[1]}/${match[2]}/${match[3]}`
        : String(value);
}

function setKfcBreakfastState(state) {
    kfcBreakfastElements.loading.hidden =
        state !== "loading";

    kfcBreakfastElements.error.hidden =
        state !== "error";

    kfcBreakfastElements.empty.hidden =
        state !== "empty";

    const controlsDisabled =
        state === "loading" ||
        state === "error";

    kfcBreakfastElements.search.disabled =
        controlsDisabled;

    if (state === "loading") {
        kfcBreakfastElements.grid
            .replaceChildren();

        if (
            kfcBreakfastElements
                .loadingText
        ) {
            kfcBreakfastElements
                .count
                .textContent =
                kfcBreakfastElements
                    .loadingText
                    .textContent;
        } else {
            kfcBreakfastElements
                .count
                .textContent =
                "正在取得優惠資料...";
        }
    }

    if (state === "error") {
        kfcBreakfastElements.grid
            .replaceChildren();

        kfcBreakfastElements
            .count
            .textContent =
            "優惠資料載入失敗";
    }
}