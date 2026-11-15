/*
 * Shared site behaviour: theme toggle and obfuscated email link.
 * Loaded with <script src="js/site.js" defer></script> at the end of <body>.
 *
 * The initial theme is applied by the small inline snippet in <head>
 * (to avoid a flash of the wrong theme); this file only wires the button.
 * Pages that need to redraw charts when the theme changes can listen for
 * document.addEventListener('themechange', (e) => { e.detail.theme })
 */
(function () {
  "use strict";

  const themeToggleBtn = document.getElementById("theme-toggle");
  const themeToggleLightIcon = document.getElementById("theme-toggle-light-icon");
  const themeToggleDarkIcon = document.getElementById("theme-toggle-dark-icon");

  function updateIcons(theme) {
    if (theme === "dark") {
      themeToggleLightIcon?.classList.remove("hidden");
      themeToggleDarkIcon?.classList.add("hidden");
      themeToggleBtn?.setAttribute("aria-label", "Switch to light theme");
    } else {
      themeToggleLightIcon?.classList.add("hidden");
      themeToggleDarkIcon?.classList.remove("hidden");
      themeToggleBtn?.setAttribute("aria-label", "Switch to dark theme");
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    updateIcons(theme);
    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  updateIcons(document.documentElement.getAttribute("data-theme") || "light");

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
      const newTheme = activeTheme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  }

  // Follow the OS preference while the visitor has not chosen a theme explicitly.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

  // Email link handler (address assembled at click time to deter scrapers).
  document.querySelectorAll(".js-email-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const a = "Justin.richard.hill@";
      const b = "gmail.com";
      window.open(`mailto:${a}${b}`, "email");
    });
  });
})();
