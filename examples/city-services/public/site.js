// Menus and the site's own forms (plain JSON calls to the backend).
document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".menu-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
    btn.setAttribute("aria-expanded", String(!open));
  });
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".mainnav")) document.querySelectorAll(".menu-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
});

function show(form, text, ok) {
  const box = form.querySelector(".result");
  box.textContent = text;
  box.classList.toggle("error", !ok);
  box.hidden = false;
}

document.querySelectorAll("form[data-api]").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch(form.dataset.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return show(form, data.error ?? "Something went wrong.", false);
    if (form.dataset.next) {
      const next = document.getElementById(form.dataset.next);
      next.otpRequestId.value = data.otpRequestId;
      next.hidden = false;
      return show(form, data.message, true);
    }
    show(form, `Done. Your reference is ${data.referenceId}. Status: ${data.status}.`, true);
  });
});

document.querySelectorAll("form[data-track]").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = new FormData(form).get("referenceId").trim().toUpperCase();
    const res = await fetch(`/api/status/${encodeURIComponent(id)}`);
    const data = await res.json();
    show(form, res.ok ? `${data.request}: ${data.status}` : data.error, res.ok);
  });
});
