const DISCOUNT_VENDOR_API_URL =
    "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=DISCOUNT_VENDOR";

const DISCOUNT_VENDOR_API_URL_BK =
    "https://script.google.com/macros/s/AKfycbzApcrcbGcv5sM6o857xlJXzqp_yFg18VPKIVOShRzCeRouhqrK3Q5tgMHG3yXqZN91Pw/exec?api=DISCOUNT_VENDOR";

const VENDOR_CACHE_KEY =
    "discount_vendor_cache";

const VENDOR_CACHE_TIME_KEY =
    "discount_vendor_cache_time";

const CACHE_DURATION =
    60 * 60 * 1000;

const RETRY_DELAY =
    1000;

const VENDOR_LOADING_IMAGE =
    "assets/icon/loading.webp";

const vendorElements = {};

let allVendors = [];

document.addEventListener(
    "DOMContentLoaded",
    () => {
        vendorElements.typeFilter =
            document.querySelector(
                "#vendor-type-filter"
            );

        vendorElements.search =
            document.querySelector(
                "#vendor-search"
            );

        vendorElements.grid =
            document.querySelector(
                "#vendor-card-grid"
            );

        vendorElements.loading =
            document.querySelector(
                "#vendor-loading"
            );

        vendorElements.error =
            document.querySelector(
                "#vendor-error"
            );

        vendorElements.empty =
            document.querySelector(
                "#vendor-empty"
            );

        vendorElements.count =
            document.querySelector(
                "#vendor-result-count"
            );

        vendorElements.reload =
            document.querySelector(
                "#vendor-reload"
            );

        createVendorLoadingContent();

        vendorElements.typeFilter
            .addEventListener(
                "change",
                filterVendors
            );

        vendorElements.search
            .addEventListener(
                "input",
                filterVendors
            );

        vendorElements.reload
            .addEventListener(
                "click",
                handleVendorReload
            );

        loadVendors();
    }
);

function handleVendorReload() {
    clearVendorLocalCache();

    loadVendors(true);
}

async function loadVendors(
    forceRefresh = false
) {
    setVendorLoadingText(
        "正在取得特約商店資料..."
    );

    setVendorState("loading");

    try {
        if (!forceRefresh) {
            const cachedVendors =
                getValidVendorCache();

            if (cachedVendors !== null) {
                console.log(
                    "使用本機快取資料"
                );

                allVendors =
                    cachedVendors.filter(
                        isValidVendor
                    );

                buildVendorTypeOptions(
                    allVendors
                );

                renderVendors(
                    allVendors,
                    false
                );

                return;
            }
        }

        const data =
            await fetchVendorDataWithBackup();

        if (data.length > 0) {
            saveVendorLocalCache(data);
        } else {
            clearVendorLocalCache();
        }

        allVendors =
            data.filter(
                isValidVendor
            );

        buildVendorTypeOptions(
            allVendors
        );

        renderVendors(
            allVendors,
            false
        );
    } catch (error) {
        console.error(
            "特約商店 API 三次連線皆失敗：",
            error
        );

        setVendorState("error");
    }
}

async function fetchVendorDataWithBackup() {
    let lastError = null;

    try {
        setVendorLoadingText(
            "正在取得特約商店資料..."
        );

        return await fetchVendorApi(
            DISCOUNT_VENDOR_API_URL,
            "主要 API 第一次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "主要 API 第一次連線失敗：",
            error
        );
    }

    setVendorLoadingText(
        "第二次連線嘗試..."
    );

    await wait(RETRY_DELAY);

    try {
        return await fetchVendorApi(
            DISCOUNT_VENDOR_API_URL,
            "主要 API 第二次連線"
        );
    } catch (error) {
        lastError = error;

        console.warn(
            "主要 API 第二次連線失敗：",
            error
        );
    }

    setVendorLoadingText(
        "第三次連線嘗試..."
    );

    await wait(RETRY_DELAY);

    try {
        return await fetchVendorApi(
            DISCOUNT_VENDOR_API_URL_BK,
            "備援 API 連線"
        );
    } catch (error) {
        lastError = error;

        console.error(
            "備援 API 連線失敗：",
            error
        );
    }

    throw lastError ||
    new Error(
        "特約商店 API 連線失敗"
    );
}

async function fetchVendorApi(
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

function getValidVendorCache() {
    const cachedData =
        localStorage.getItem(
            VENDOR_CACHE_KEY
        );

    const cachedTime =
        localStorage.getItem(
            VENDOR_CACHE_TIME_KEY
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
        clearVendorLocalCache();
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
                "本機快取為空，重新呼叫 API"
            );

            clearVendorLocalCache();
            return null;
        }

        return parsedData;
    } catch (error) {
        console.warn(
            "本機快取內容無法解析，重新呼叫 API：",
            error
        );

        clearVendorLocalCache();
        return null;
    }
}

function saveVendorLocalCache(data) {
    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        clearVendorLocalCache();
        return;
    }

    try {
        localStorage.setItem(
            VENDOR_CACHE_KEY,
            JSON.stringify(data)
        );

        localStorage.setItem(
            VENDOR_CACHE_TIME_KEY,
            String(Date.now())
        );
    } catch (error) {
        console.warn(
            "無法寫入本機快取：",
            error
        );
    }
}

function clearVendorLocalCache() {
    localStorage.removeItem(
        VENDOR_CACHE_KEY
    );

    localStorage.removeItem(
        VENDOR_CACHE_TIME_KEY
    );
}

function createVendorLoadingContent() {
    if (!vendorElements.loading) {
        return;
    }

    vendorElements.loading
        .replaceChildren();

    const loadingImage =
        document.createElement("img");

    loadingImage.src =
        VENDOR_LOADING_IMAGE;

    loadingImage.alt = "";

    loadingImage.className =
        "vendor-loading__image";

    loadingImage.setAttribute(
        "aria-hidden",
        "true"
    );

    const loadingText =
        document.createElement("span");

    loadingText.className =
        "vendor-loading__text";

    loadingText.textContent =
        "正在取得特約商店資料...";

    vendorElements.loading.append(
        loadingImage,
        loadingText
    );

    vendorElements.loading.setAttribute(
        "role",
        "status"
    );

    vendorElements.loading.setAttribute(
        "aria-live",
        "polite"
    );

    vendorElements.loadingText =
        loadingText;
}

function setVendorLoadingText(text) {
    if (!vendorElements.loadingText) {
        createVendorLoadingContent();
    }

    if (vendorElements.loadingText) {
        vendorElements.loadingText
            .textContent = text;
    }

    if (
        vendorElements.count &&
        !vendorElements.loading?.hidden
    ) {
        vendorElements.count
            .textContent = text;
    }
}

function wait(milliseconds) {
    return new Promise(
        (resolve) => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        }
    );
}

function isValidVendor(vendor) {
    return (
        vendor &&
        typeof vendor === "object" &&
        Boolean(vendor.companyName)
    );
}

function buildVendorTypeOptions(
    vendors
) {
    const types = [];
    const seenTypes = new Set();

    vendors.forEach(
        (vendor) => {
            const type =
                String(
                    vendor.type || ""
                ).trim();

            if (
                type &&
                !seenTypes.has(type)
            ) {
                seenTypes.add(type);
                types.push(type);
            }
        }
    );

    vendorElements.typeFilter
        .replaceChildren();

    const allOption =
        document.createElement(
            "option"
        );

    allOption.value = "";
    allOption.textContent = "全部";

    vendorElements.typeFilter
        .append(allOption);

    types.forEach(
        (type) => {
            const option =
                document.createElement(
                    "option"
                );

            option.value = type;
            option.textContent = type;

            vendorElements.typeFilter
                .append(option);
        }
    );
}

function filterVendors() {
    const selectedType =
        vendorElements.typeFilter.value;

    const keyword =
        vendorElements.search
            .value
            .trim()
            .toLocaleLowerCase(
                "zh-Hant-TW"
            );

    const filteredVendors =
        allVendors.filter(
            (vendor) => {
                const matchesType =
                    !selectedType ||
                    String(
                        vendor.type || ""
                    ) === selectedType;

                const companyName =
                    String(
                        vendor.companyName ||
                        ""
                    ).toLocaleLowerCase(
                        "zh-Hant-TW"
                    );

                const matchesKeyword =
                    !keyword ||
                    companyName.includes(
                        keyword
                    );

                return (
                    matchesType &&
                    matchesKeyword
                );
            }
        );

    const isFiltered =
        Boolean(
            selectedType ||
            keyword
        );

    renderVendors(
        filteredVendors,
        isFiltered
    );
}

function renderVendors(
    vendors,
    isFiltered
) {
    vendorElements.grid
        .replaceChildren();

    if (vendors.length === 0) {
        vendorElements.count
            .textContent =
            isFiltered
                ? "找不到符合條件的特約商店"
                : "目前沒有特約商店資料";

        setVendorState("empty");
        return;
    }

    const fragment =
        document.createDocumentFragment();

    vendors.forEach(
        (vendor) => {
            fragment.append(
                createVendorCard(vendor)
            );
        }
    );

    vendorElements.grid.append(
        fragment
    );

    vendorElements.count
        .textContent =
        isFiltered
            ? `找到 ${vendors.length} 間特約商店`
            : `目前共有 ${vendors.length} 間特約商店`;

    setVendorState("success");
}

function createVendorCard(vendor) {
    const card =
        document.createElement(
            "article"
        );

    card.className =
        "vendor-card";

    const type =
        document.createElement("p");

    type.className =
        "vendor-card__type";

    type.textContent =
        String(
            vendor.type || "未分類"
        );

    const companyName =
        document.createElement("h2");

    companyName.className =
        "vendor-card__name";

    companyName.textContent =
        String(vendor.companyName);

    card.append(
        type,
        companyName
    );

    if (vendor.note) {
        const note =
            document.createElement("p");

        note.className =
            "vendor-card__note";

        note.textContent =
            String(vendor.note);

        card.append(note);
    }

    const footer =
        document.createElement(
            "footer"
        );

    footer.className =
        "vendor-card__footer";

    const contractName =
        String(
            vendor.contract_name || ""
        ).trim();

    const contractUrl =
        String(
            vendor.contract_url || ""
        ).trim();

    if (
        contractName &&
        isSafeExternalUrl(
            contractUrl
        )
    ) {
        const contractLink =
            document.createElement("a");

        contractLink.className =
            "vendor-card__contract";

        contractLink.href =
            contractUrl;

        contractLink.target =
            "_blank";

        contractLink.rel =
            "noopener noreferrer";

        contractLink.title =
            `開新分頁查看${contractName}`;

        const contractText =
            document.createElement(
                "span"
            );

        contractText.textContent =
            contractName;

        contractLink.append(
            contractText,
            createExternalLinkIcon()
        );

        footer.append(
            contractLink
        );
    }

    const endDate =
        document.createElement("p");

    endDate.className =
        "vendor-card__date";

    endDate.textContent =
        vendor.endDate
            ? `截止日期：${formatVendorDate(vendor.endDate)}`
            : "截止日期：未提供";

    footer.append(endDate);
    card.append(footer);

    return card;
}

function createExternalLinkIcon() {
    const svgNamespace =
        "http://www.w3.org/2000/svg";

    const icon =
        document.createElementNS(
            svgNamespace,
            "svg"
        );

    icon.classList.add(
        "vendor-card__external-icon"
    );

    icon.setAttribute(
        "viewBox",
        "0 0 24 24"
    );

    icon.setAttribute(
        "aria-hidden",
        "true"
    );

    const pathOne =
        document.createElementNS(
            svgNamespace,
            "path"
        );

    pathOne.setAttribute(
        "d",
        "M14 5h5v5"
    );

    const pathTwo =
        document.createElementNS(
            svgNamespace,
            "path"
        );

    pathTwo.setAttribute(
        "d",
        "M10 14 19 5"
    );

    const pathThree =
        document.createElementNS(
            svgNamespace,
            "path"
        );

    pathThree.setAttribute(
        "d",
        "M19 13v6H5V5h6"
    );

    icon.append(
        pathOne,
        pathTwo,
        pathThree
    );

    return icon;
}

function isSafeExternalUrl(value) {
    try {
        const url =
            new URL(value);

        return (
            url.protocol === "https:" ||
            url.protocol === "http:"
        );
    } catch (error) {
        return false;
    }
}

function formatVendorDate(value) {
    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    return match
        ? `${match[1]}/${match[2]}/${match[3]}`
        : String(value);
}

function setVendorState(state) {
    vendorElements.loading.hidden =
        state !== "loading";

    vendorElements.error.hidden =
        state !== "error";

    vendorElements.empty.hidden =
        state !== "empty";

    const controlsDisabled =
        state === "loading" ||
        state === "error";

    vendorElements.typeFilter.disabled =
        controlsDisabled;

    vendorElements.search.disabled =
        controlsDisabled;

    if (state === "loading") {
        vendorElements.grid
            .replaceChildren();

        if (
            vendorElements.loadingText
        ) {
            vendorElements.count
                .textContent =
                vendorElements
                    .loadingText
                    .textContent;
        } else {
            vendorElements.count
                .textContent =
                "正在取得特約商店資料...";
        }
    }

    if (state === "error") {
        vendorElements.grid
            .replaceChildren();

        vendorElements.count
            .textContent =
            "特約商店資料載入失敗";
    }
}