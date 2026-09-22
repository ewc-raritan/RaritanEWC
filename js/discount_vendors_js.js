const DISCOUNT_VENDOR_API_URL = "https://script.google.com/macros/s/AKfycby5pD8nlMt62GdcAeHZKTj7cKF4xFOigK_Qhn7JV778mCIbwp0sO2eHKSnIt6TL57ZM/exec?api=DISCOUNT_VENDOR";

const VENDOR_CACHE_KEY = "discount_vendor_cache";
const VENDOR_CACHE_TIME_KEY = "discount_vendor_cache_time";
const CACHE_DURATION = 60 * 60 * 1000;

const vendorElements = {};
let allVendors = [];

document.addEventListener("DOMContentLoaded", () => {
  vendorElements.typeFilter = document.querySelector("#vendor-type-filter");
  vendorElements.search = document.querySelector("#vendor-search");
  vendorElements.grid = document.querySelector("#vendor-card-grid");
  vendorElements.loading = document.querySelector("#vendor-loading");
  vendorElements.error = document.querySelector("#vendor-error");
  vendorElements.empty = document.querySelector("#vendor-empty");
  vendorElements.count = document.querySelector("#vendor-result-count");
  vendorElements.reload = document.querySelector("#vendor-reload");

  vendorElements.typeFilter.addEventListener("change", filterVendors);
  vendorElements.search.addEventListener("input", filterVendors);
  vendorElements.reload.addEventListener(
      "click",
      () => {
        localStorage.removeItem(
            VENDOR_CACHE_KEY
        );

        localStorage.removeItem(
            VENDOR_CACHE_TIME_KEY
        );

        loadVendors(true);
      }
  );

  loadVendors();
});

async function loadVendors(forceRefresh = false) {

  setVendorState("loading");

  try {

    if (!forceRefresh) {

      const cachedData =
          localStorage.getItem(
              VENDOR_CACHE_KEY
          );

      const cachedTime =
          localStorage.getItem(
              VENDOR_CACHE_TIME_KEY
          );

      const cacheValid =
          cachedData &&
          cachedTime &&
          (
              Date.now() -
              Number(cachedTime)
          ) < CACHE_DURATION;

      if (cacheValid) {

        console.log(
            "使用本機快取資料"
        );

        allVendors =
            JSON.parse(cachedData)
                .filter(
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

    const response =
        await fetch(
            DISCOUNT_VENDOR_API_URL,
            {
              method: "GET",
              redirect: "follow",
              cache: "no-store"
            }
        );

    if (!response.ok) {
      throw new Error(
          `HTTP ${response.status}`
      );
    }

    const data =
        await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
          "API 回傳格式不是陣列"
      );
    }

    localStorage.setItem(
        VENDOR_CACHE_KEY,
        JSON.stringify(data)
    );

    localStorage.setItem(
        VENDOR_CACHE_TIME_KEY,
        String(Date.now())
    );

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
        "特約商店 API 載入失敗：",
        error
    );

    setVendorState("error");
  }
}

function isValidVendor(vendor) {
  return vendor && typeof vendor === "object" && vendor.companyName;
}

function buildVendorTypeOptions(vendors) {
  const types = [];
  const seenTypes = new Set();

  vendors.forEach((vendor) => {
    const type = String(vendor.type || "").trim();

    if (type && !seenTypes.has(type)) {
      seenTypes.add(type);
      types.push(type);
    }
  });

  vendorElements.typeFilter.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "全部";
  vendorElements.typeFilter.append(allOption);

  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    vendorElements.typeFilter.append(option);
  });
}

function filterVendors() {
  const selectedType = vendorElements.typeFilter.value;
  const keyword = vendorElements.search.value.trim().toLocaleLowerCase("zh-Hant-TW");

  const filteredVendors = allVendors.filter((vendor) => {
    const matchesType = !selectedType || String(vendor.type || "") === selectedType;
    const companyName = String(vendor.companyName || "").toLocaleLowerCase("zh-Hant-TW");
    const matchesKeyword = !keyword || companyName.includes(keyword);

    return matchesType && matchesKeyword;
  });

  const isFiltered = Boolean(selectedType || keyword);
  renderVendors(filteredVendors, isFiltered);
}

function renderVendors(vendors, isFiltered) {
  vendorElements.grid.replaceChildren();

  if (vendors.length === 0) {
    vendorElements.count.textContent = isFiltered
      ? "找不到符合條件的特約商店"
      : "目前沒有特約商店資料";
    setVendorState("empty");
    return;
  }

  const fragment = document.createDocumentFragment();

  vendors.forEach((vendor) => {
    fragment.append(createVendorCard(vendor));
  });

  vendorElements.grid.append(fragment);
  vendorElements.count.textContent = isFiltered
    ? `找到 ${vendors.length} 間特約商店`
    : `目前共有 ${vendors.length} 間特約商店`;

  setVendorState("success");
}

function createVendorCard(vendor) {
  const card = document.createElement("article");
  card.className = "vendor-card";

  const type = document.createElement("p");
  type.className = "vendor-card__type";
  type.textContent = String(vendor.type || "未分類");

  const companyName = document.createElement("h2");
  companyName.className = "vendor-card__name";
  companyName.textContent = String(vendor.companyName);

  card.append(type, companyName);

  if (vendor.note) {
    const note = document.createElement("p");
    note.className = "vendor-card__note";
    note.textContent = String(vendor.note);
    card.append(note);
  }

  const footer = document.createElement("footer");
  footer.className = "vendor-card__footer";

  const contractName = String(vendor.contract_name || "").trim();
  const contractUrl = String(vendor.contract_url || "").trim();

  if (contractName && isSafeExternalUrl(contractUrl)) {
    const contractLink = document.createElement("a");
    contractLink.className = "vendor-card__contract";
    contractLink.href = contractUrl;
    contractLink.target = "_blank";
    contractLink.rel = "noopener noreferrer";
    contractLink.title = `開新分頁查看${contractName}`;

    const contractText = document.createElement("span");
    contractText.textContent = contractName;

    contractLink.append(contractText, createExternalLinkIcon());
    footer.append(contractLink);
  }

  const endDate = document.createElement("p");
  endDate.className = "vendor-card__date";
  endDate.textContent = vendor.endDate
    ? `截止日期：${formatVendorDate(vendor.endDate)}`
    : "截止日期：未提供";

  footer.append(endDate);
  card.append(footer);

  return card;
}

function createExternalLinkIcon() {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.classList.add("vendor-card__external-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");

  const pathOne = document.createElementNS(svgNamespace, "path");
  pathOne.setAttribute("d", "M14 5h5v5");

  const pathTwo = document.createElementNS(svgNamespace, "path");
  pathTwo.setAttribute("d", "M10 14 19 5");

  const pathThree = document.createElementNS(svgNamespace, "path");
  pathThree.setAttribute("d", "M19 13v6H5V5h6");

  icon.append(pathOne, pathTwo, pathThree);
  return icon;
}

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (error) {
    return false;
  }
}

function formatVendorDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : String(value);
}

function setVendorState(state) {
  vendorElements.loading.hidden = state !== "loading";
  vendorElements.error.hidden = state !== "error";
  vendorElements.empty.hidden = state !== "empty";

  const controlsDisabled = state === "loading" || state === "error";
  vendorElements.typeFilter.disabled = controlsDisabled;
  vendorElements.search.disabled = controlsDisabled;

  if (state === "loading") {
    vendorElements.grid.replaceChildren();
    vendorElements.count.textContent = "正在取得特約商店資料...";
  }

  if (state === "error") {
    vendorElements.grid.replaceChildren();
    vendorElements.count.textContent = "特約商店資料載入失敗";
  }
}
