const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const filterButtons = document.querySelectorAll("[data-filter]");
const productCards = document.querySelectorAll("[data-category]");
const leadForms = document.querySelectorAll("[data-lead-form]");
const salesWhatsApp = "8613827719946";
const salesEmail = "57317996@qq.com";

if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    productCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

leadForms.forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = form.querySelector("[data-form-message]");
    const requiredFields = [...form.querySelectorAll("[required]")];
    const isComplete = requiredFields.every((field) => String(field.value).trim().length > 0);

    if (!isComplete) {
      message.textContent = "Please complete the required fields first.";
      message.style.color = "#b66a7d";
      return;
    }

    const fields = requiredFields.map((field) => {
      const label = field.closest("label")?.querySelector("span")?.textContent?.trim() || field.name;
      return `${label}: ${String(field.value).trim()}`;
    });
    const subject = form.classList.contains("quote-form")
      ? "Quick fabric RFQ from Bingo Textile website"
      : "Fabric inquiry from Bingo Textile website";
    const inquiryText = [
      subject,
      "",
      ...fields,
      "",
      "Source: https://www.bingofabric.com/"
    ].join("\n");
    const whatsappUrl = `https://wa.me/${salesWhatsApp}?text=${encodeURIComponent(inquiryText)}`;
    const emailUrl = `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryText)}`;

    message.textContent = "Opening WhatsApp with your inquiry. If it does not open, ";
    const fallbackLink = document.createElement("a");
    fallbackLink.href = emailUrl;
    fallbackLink.textContent = "email this inquiry instead";
    message.appendChild(fallbackLink);
    message.append(".");
    message.style.color = "#3f8f7c";

    window.open(whatsappUrl, "_blank", "noopener");
    form.reset();
  });
});
