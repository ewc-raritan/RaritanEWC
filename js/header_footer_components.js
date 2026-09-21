class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="site-header">
        <div class="site-header__inner">
          <a class="brand" href="index.html" aria-label="Raritan EWC 首頁">Raritan EWC</a>

          <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">
            <span class="sr-only">開啟導覽選單</span>
            <span></span><span></span><span></span>
          </button>

          <nav id="primary-navigation" class="primary-nav" aria-label="主要導覽">
            <a href="index.html">首頁</a>

            <div class="nav-dropdown">
             <button class="nav-dropdown__trigger" type="button" aria-expanded="false">福委會服務</button>
              <div class="nav-dropdown__menu">
                <a href="discount-vendors.html">特約商店清單</a>
                <a href="amot-id.html">AMOT 特約企業識別</a>
                <a href="pizza-hot.html">Pizza Hot 優惠碼</a>
                <a href="kfc-breakfast.html">KFC 早餐優惠碼</a>
                <a href="kfc-normal.html">KFC 正餐優惠碼</a>              
              </div>
            </div>

            <a href="https://www.raritan.com/ap/tw" target="_blank" rel="noopener noreferrer">公司官網</a>
          </nav>
        </div>
      </header>
    `;

    const navToggle = this.querySelector('.nav-toggle');
    const nav = this.querySelector('.primary-nav');
    const dropdown = this.querySelector('.nav-dropdown');
    const dropdownButton = this.querySelector('.nav-dropdown__trigger');

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('is-open', !isOpen);
    });

    dropdownButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = dropdownButton.getAttribute('aria-expanded') === 'true';
      dropdownButton.setAttribute('aria-expanded', String(!isOpen));
      dropdown.classList.toggle('is-open', !isOpen);
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove('is-open');
        dropdownButton.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) {
        nav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

class SiteFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="site-footer">
        <p>Copyright © <span data-copyright-year>2026</span> Raritan EWC</p>
      </footer>
    `;
  }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);
