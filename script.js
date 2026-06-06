const body = document.body;
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".site-nav a");
const filterButtons = document.querySelectorAll("[data-filter]");
const productCards = document.querySelectorAll("[data-category]");
const leadForms = document.querySelectorAll("[data-lead-form]");

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

    message.textContent = "Inquiry recorded. After email or CRM integration, it will be sent to the sales team.";
    message.style.color = "#3f8f7c";
    form.reset();
  });
});
