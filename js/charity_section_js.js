document.addEventListener("DOMContentLoaded", () => {
    const select = document.querySelector("#charity-card-select");
    const cards = Array.from(document.querySelectorAll(".charity-card"));

    if (!select || cards.length === 0) {
        return;
    }

    cards.forEach((card, index) => {
        const nameElement = card.querySelector(".charity-card__name");
        const cardName = nameElement?.textContent.trim();

        if (!cardName) {
            return;
        }

        const cardId = card.id || `charity-card-${index + 1}`;
        card.id = cardId;

        const option = document.createElement("option");
        option.value = cardId;
        option.textContent = cardName;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        const selectedCard = document.getElementById(select.value);

        if (!selectedCard) {
            return;
        }

        selectedCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        select.value = "";
    });
});
