document.addEventListener("DOMContentLoaded", () => {
  const image = document.querySelector(".amot-image");
  const errorMessage = document.querySelector(".amot-image-error");

  if (!image || !errorMessage) {
    return;
  }

  image.addEventListener("error", () => {
    image.closest(".amot-image-frame")?.setAttribute("hidden", "");
    errorMessage.hidden = false;
  });
});
