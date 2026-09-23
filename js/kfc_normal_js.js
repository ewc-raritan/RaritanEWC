const KFC_NORMAL_API_URL =
    "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=KFC_NORMAL";

const KFC_NORMAL_API_URL_BK =
    "https://script.google.com/macros/s/AKfycbzApcrcbGcv5sM6o857xlJXzqp_yFg18VPKIVOShRzCeRouhqrK3Q5tgMHG3yXqZN91Pw/exec?api=KFC_NORMAL";

const KFC_NORMAL_CACHE_KEY =
    "kfc_normal_cache";

const KFC_NORMAL_CACHE_TIME_KEY =
    "kfc_normal_cache_time";

const KFC_NORMAL_CACHE_DURATION =
    60 * 60 * 1000;

const KFC_NORMAL_RETRY_DELAY =
    1000;

const KFC_NORMAL_LOADING_IMAGE =
    "assets/icon/loading.webp";

const kfcNormalElements = {};

let kfcNormalOffers = [];

document.addEventListener(
    "DOMContentLoaded",
    () => {
        kfcNormalElements.search =
            document.querySelector(
                "#kfc-normal-search"
            );

        kfcNormalElements.grid =
            document.querySelector(
                "#kfc-normal-card-grid"
            );

        kfcNormalElements.loading =
            document.querySelector(
                "#kfc-normal-loading"
            );

        kfcNormalElements.error =
            document.querySelector(
                "#kfc-normal-error"
            );

        kfcNormalElements.empty =
            document.querySelector(
                "#kfc-normal-empty"
            );

        kfcNormalElements.count =
            document.querySelector(
                "#kfc-normal-result-count"
            );

        kfcNormalElements.reload =
            document.querySelector(
                "#kfc-normal-reload"
            );

        createKfcNormalLoadingContent();

        kfcNormalElements.search
            .addEventListener(
                "input",
                filterKfcNormalOffers
            );

        kfcNormalElements.reload
            .addEventListener(
                "click",
                handleKfcNormalReload
            );

        loadKfcNormalOffers();
    }
);

function handleKfcNormalReload() {
    clearKfcNormalLocalCache();

    loadKfcNormalOffers(true);
}

async function loadKfcNormalOffers(
    forceRefresh = false
) {
    setKfcNormalLoadingText(
        "正在取得優惠資料..."
    );

    setKfcNormalState("loading");

    try {
        if (!forceRefresh) {
            const cachedOffers =
                getValidKfcNormalCache();

            if (cachedOffers !== null) {
                console.log(
                    "KFC 一般優惠使用本機快取資料"
                );

                kfcNormalOffers =
                    cachedOffers.filter(
                        isValidKfcNormalOffer
                    );

                renderKfcNormalOffers(
                    kfcNormalOffers,
                    false
                );

                return;
            }
        }

        const data =
            await fetchKfcNormalDataWithBackup();

        if (data.length > 0) {
            saveKfcNormalLocalCache(data);
        } else {
            clearKfcNormalLocalCache();
        }

        kfcNormalOffers =
            data.filter(
                isValidKfcNormalOffer
            );

        renderKfcNormalOffers(
            kfcNormalOffers,
            false
        );
    } catch (error) {
        console.error(
            "KFC 一般優惠 API 三次連線皆失敗：",
            error
        );

        setKfcNormalState("error");
    }
}

async function fetchKfcNormalDataWithBackup() {
    let lastError = null;

    try {
        setKfcNormalLoadingText(
            "正在取得優惠資料..."
        );

        return await fetchKfcNormalApi(
            KFC_NORMAL_API_URL,
            "KFC 一般優惠主要 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "KFC 一般優惠主要 API 第一次連線失敗：",
            error
        );
    }

    setKfcNormalLoadingText(
        "第二次連線嘗試..."
    );

    await waitKfcNormalRetry(
        KFC_NORMAL_RETRY_DELAY
    );

    try {
        return await fetchKfcNormalApi(
            KFC_NORMAL_API_URL,
            "KFC 一般優惠主要 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "KFC 一般優惠主要 API 第二次連線失敗：",
            error
        );
    }

    setKfcNormalLoadingText(
        "第三次連線嘗試..."
    );

    await waitKfcNormalRetry(
        KFC_NORMAL_RETRY_DELAY
    );

    try {
        return await fetchKfcNormalApi(
            KFC_NORMAL_API_URL_BK,
            "KFC 一般優惠備援 API 連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "KFC 一般優惠備援 API 連線失敗：",
            error
        );
    }

    throw (
        lastError ||
        new Error(
            "KFC 一般優惠 API 連線失敗"
        )
    );
}

async function fetchKfcNormalApi(
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

function getValidKfcNormalCache() {
    const cachedData =
        localStorage.getItem(
            KFC_NORMAL_CACHE_KEY
        );

    const cachedTime =
        localStorage.getItem(
            KFC_NORMAL_CACHE_TIME_KEY
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
        cacheAge >= KFC_NORMAL_CACHE_DURATION
    ) {
        clearKfcNormalLocalCache();

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
                "KFC 一般優惠本機快取為空，重新呼叫 API"
            );

            clearKfcNormalLocalCache();

            return null;
        }

        return parsedData;
    } catch (error) {
        console.warn(
            "KFC 一般優惠本機快取無法解析，重新呼叫 API：",
            error
        );

        clearKfcNormalLocalCache();

        return null;
    }
}

function saveKfcNormalLocalCache(data) {
    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        clearKfcNormalLocalCache();

        return;
    }

    try {
        localStorage.setItem(
            KFC_NORMAL_CACHE_KEY,
            JSON.stringify(data)
        );

        localStorage.setItem(
            KFC_NORMAL_CACHE_TIME_KEY,
            String(Date.now())
        );
    } catch (error) {
        console.warn(
            "KFC 一般優惠本機快取寫入失敗：",
            error
        );
    }
}

function clearKfcNormalLocalCache() {
    localStorage.removeItem(
        KFC_NORMAL_CACHE_KEY
    );

    localStorage.removeItem(
        KFC_NORMAL_CACHE_TIME_KEY
    );
}

function createKfcNormalLoadingContent() {
    if (!kfcNormalElements.loading) {
        return;
    }

    kfcNormalElements.loading
        .replaceChildren();

    const loadingImage =
        document.createElement("img");

    loadingImage.src =
        KFC_NORMAL_LOADING_IMAGE;

    loadingImage.alt = "";

    loadingImage.className =
        "kfc-normal-loading__image";

    loadingImage.setAttribute(
        "aria-hidden",
        "true"
    );

    const loadingText =
        document.createElement("span");

    loadingText.className =
        "kfc-normal-loading__text";

    loadingText.textContent =
        "正在取得優惠資料...";

    kfcNormalElements.loading.append(
        loadingImage,
        loadingText
    );

    kfcNormalElements.loading
        .setAttribute(
            "role",
            "status"
        );

    kfcNormalElements.loading
        .setAttribute(
            "aria-live",
            "polite"
        );

    kfcNormalElements.loadingText =
        loadingText;
}

function setKfcNormalLoadingText(text) {
    if (!kfcNormalElements.loadingText) {
        createKfcNormalLoadingContent();
    }

    if (kfcNormalElements.loadingText) {
        kfcNormalElements
            .loadingText
            .textContent = text;
    }

    if (
        kfcNormalElements.count &&
        !kfcNormalElements.loading?.hidden
    ) {
        kfcNormalElements
            .count
            .textContent = text;
    }
}

function waitKfcNormalRetry(milliseconds) {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function isValidKfcNormalOffer(offer) {
    return (
        offer &&
        typeof offer === "object" &&
        Boolean(offer.code) &&
        Boolean(offer.detail)
    );
}

function filterKfcNormalOffers() {
    const keyword =
        kfcNormalElements.search
            .value
            .trim()
            .toLocaleLowerCase(
                "zh-Hant-TW"
            );

    if (!keyword) {
        renderKfcNormalOffers(
            kfcNormalOffers,
            false
        );

        return;
    }

    const filteredOffers =
        kfcNormalOffers.filter(
            (offer) =>
                String(offer.detail)
                    .toLocaleLowerCase(
                        "zh-Hant-TW"
                    )
                    .includes(keyword)
        );

    renderKfcNormalOffers(
        filteredOffers,
        true
    );
}

function renderKfcNormalOffers(
    offers,
    isSearchResult
) {
    kfcNormalElements.grid
        .replaceChildren();

    if (offers.length === 0) {
        kfcNormalElements
            .count
            .textContent =
            isSearchResult
                ? "找不到符合條件的優惠"
                : "目前沒有優惠資料";

        setKfcNormalState("empty");

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
                "kfc-normal-card";

            const code =
                document.createElement(
                    "p"
                );

            code.className =
                "kfc-normal-card__code";

            code.textContent =
                `優惠代碼 ${String(offer.code)}`;

            const detail =
                document.createElement(
                    "p"
                );

            detail.className =
                "kfc-normal-card__detail";

            detail.textContent =
                String(offer.detail);

            const footer =
                document.createElement(
                    "footer"
                );

            footer.className =
                "kfc-normal-card__footer";

            const discountText =
                calculateKfcNormalDiscount(
                    offer.discountPrice,
                    offer.originalPrice
                );

            if (discountText) {
                const discount =
                    document.createElement(
                        "p"
                    );

                discount.className =
                    "kfc-normal-card__discount";

                discount.textContent =
                    discountText;

                footer.append(discount);
            }

            const endDate =
                document.createElement(
                    "p"
                );

            endDate.className =
                "kfc-normal-card__date";

            endDate.textContent =
                offer.endDate
                    ? `優惠截止日期：${formatKfcNormalDate(offer.endDate)}`
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

    kfcNormalElements.grid.append(
        fragment
    );

    kfcNormalElements
        .count
        .textContent =
        isSearchResult
            ? `找到 ${offers.length} 組優惠`
            : `目前共有 ${offers.length} 組優惠`;

    setKfcNormalState("success");
}

function calculateKfcNormalDiscount(
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

function formatKfcNormalDate(value) {
    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    return match
        ? `${match[1]}/${match[2]}/${match[3]}`
        : String(value);
}

function setKfcNormalState(state) {
    kfcNormalElements.loading.hidden =
        state !== "loading";

    kfcNormalElements.error.hidden =
        state !== "error";

    kfcNormalElements.empty.hidden =
        state !== "empty";

    const controlsDisabled =
        state === "loading" ||
        state === "error";

    kfcNormalElements.search.disabled =
        controlsDisabled;

    if (state === "loading") {
        kfcNormalElements.grid
            .replaceChildren();

        if (kfcNormalElements.loadingText) {
            kfcNormalElements
                .count
                .textContent =
                kfcNormalElements
                    .loadingText
                    .textContent;
        } else {
            kfcNormalElements
                .count
                .textContent =
                "正在取得優惠資料...";
        }
    }

    if (state === "error") {
        kfcNormalElements.grid
            .replaceChildren();

        kfcNormalElements
            .count
            .textContent =
            "優惠資料載入失敗";
    }
}