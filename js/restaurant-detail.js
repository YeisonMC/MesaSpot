(() => {
  "use strict";
  const profile = window.ASADOR_DATA;
  const restaurant = window.MESA_DATA.restaurants.find((item) => item.id === 4);
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  document.querySelector("#detail-address").textContent = profile.address;
  document.querySelector("#detail-description").textContent =
    profile.description;
  document.querySelector("#detail-rating").textContent =
    `${restaurant.rating} (${profile.reviews} reseñas)`;
  document.querySelector("#about-copy").innerHTML = profile.about
    .map((text) => `<p>${text}</p>`)
    .join("");
  document.querySelector("#services-list").innerHTML = profile.services
    .map(([symbol, label]) => `<li>${icon(symbol)}${label}</li>`)
    .join("");
  document.querySelector("#hours-list").innerHTML = profile.hours
    .map(([day, time]) => `<div><dt>${day}</dt><dd>${time}</dd></div>`)
    .join("");
  document.querySelector("#contact-list").innerHTML = profile.contact
    .map(([symbol, value]) => `<li>${icon(symbol)}<span>${value}</span></li>`)
    .join("");
  document.querySelector("#summary-list").innerHTML = profile.summary
    .map(
      ([symbol, label, value]) =>
        `<div><dt>${icon(symbol)}${label}</dt><dd>${value}</dd></div>`,
    )
    .join("");
  document.querySelector("#locations-list").innerHTML = profile.locations
    .map(
      (location, index) =>
        `<button class="location-card ${location.primary ? "selected" : ""}" type="button" data-location="${index}" aria-pressed="${Boolean(location.primary)}">${icon("pin")}<span><strong>${location.name}${location.primary ? "<small>Principal</small>" : ""}</strong><span>${location.address}</span><span>${location.district}, Lima</span></span></button>`,
    )
    .join("");

  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(tab, focus = false) {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute("aria-controls")).hidden =
        !selected;
    });
    if (focus) tab.focus();
    window.AOS?.refreshHard();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      let target;
      if (event.key === "ArrowRight") target = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft")
        target = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") target = tabs[0];
      if (event.key === "End") target = tabs[tabs.length - 1];
      if (target) {
        event.preventDefault();
        selectTab(target, true);
      }
    });
  });
  document.querySelector("#all-locations").addEventListener("click", () => {
    const expanded = document
      .querySelector("#locations-list")
      .classList.toggle("expanded");
    document
      .querySelector("#all-locations")
      .setAttribute("aria-expanded", String(expanded));
    document.querySelector("#all-locations-label").textContent = expanded
      ? "Ver menos locales"
      : "Ver todos los locales";
  });
  document
    .querySelector("#locations-list")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-location]");
      if (!button) return;
      document.querySelectorAll("[data-location]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      const location = profile.locations[Number(button.dataset.location)];
      const status = document.querySelector("#location-status");
      status.hidden = false;
      status.textContent = `${location.name}: ${location.address}, ${location.district}, Lima. Local de demostración.`;
    });
})();
