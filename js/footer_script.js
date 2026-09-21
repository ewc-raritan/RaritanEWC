document.addEventListener('DOMContentLoaded', () => {
  const baseYear = 2026;
  const currentYear = new Date().getFullYear();
  const yearText = currentYear === baseYear
    ? String(baseYear)
    : `${baseYear}-${currentYear}`;

  document.querySelectorAll('[data-copyright-year]').forEach((element) => {
    element.textContent = yearText;
  });
});
