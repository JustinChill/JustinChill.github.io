/*
 * blog.html: instant search, topic chips, section tabs and clickable cards.
 * Loaded with defer. Indexes the cards already in the DOM; fetches nothing.
 * Without JavaScript the page is a plain index (see html.no-js rules in blog.html).
 */
(function () {
  "use strict";

  const root = document.getElementById("content");
  if (!root) return;

  const input = document.getElementById("blog-q");
  const form = input && input.closest("form");
  const countEl = document.getElementById("blog-count");
  const emptyEl = document.getElementById("blog-empty");
  const emptyQ = document.getElementById("blog-empty-q");
  const clearBtn = document.getElementById("blog-clear");
  const header = document.getElementById("blog-header");
  const tabs = Array.from(document.querySelectorAll(".blog-tab"));
  const chips = Array.from(document.querySelectorAll(".blog-chip"));

  const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

  // One searchable string per card: title, kicker, description, image alt.
  const cards = Array.from(root.querySelectorAll("article.card"));
  const index = cards.map((card) => {
    const title = card.querySelector("h3, h2");
    const kicker = card.querySelector(".kicker");
    const desc = card.querySelector(".card-content p:not(.kicker)");
    const img = card.querySelector("img");
    return {
      card,
      kicker: normalize(kicker && kicker.textContent),
      text: normalize([title && title.textContent, kicker && kicker.textContent, desc && desc.textContent, img && img.alt].filter(Boolean).join(" ")),
    };
  });
  const total = cards.length;

  // Each h2.header is followed (possibly inside a .callout) by its .container of cards.
  const sections = Array.from(root.querySelectorAll("h2.header")).map((heading) => {
    // The heading may be wrapped (e.g. .blog-section-head holds the Posts h2 and the
    // topic chips), so look for the .container after the heading, then after its wrapper.
    const nextContainer = (el) => {
      let c = el && el.nextElementSibling;
      while (c && !c.classList.contains("container")) c = c.nextElementSibling;
      return c || null;
    };
    const wrapperHead = heading.closest(".blog-section-head");
    const container = nextContainer(heading) || nextContainer(wrapperHead);
    return { heading, container, wrapper: heading.closest(".callout") || wrapperHead };
  }).filter((s) => s.container);

  let query = "";
  let topic = "";

  function apply() {
    const terms = normalize(query).split(" ").filter(Boolean);
    let shown = 0;
    for (const item of index) {
      const ok = (!topic || item.kicker === topic) && terms.every((t) => item.text.includes(t));
      item.card.hidden = !ok;
      if (ok) shown++;
    }
    for (const s of sections) {
      const any = Array.from(s.container.querySelectorAll("article.card")).some((c) => !c.hidden);
      s.container.hidden = !any;
      s.heading.hidden = !any;
      if (s.wrapper) s.wrapper.hidden = !any;
    }
    tabs.forEach((tab) => {
      const s = sections.find((x) => "#" + x.heading.id === tab.getAttribute("href"));
      tab.classList.toggle("is-empty", !!s && s.container.hidden);
    });
    chips.forEach((chip) => chip.setAttribute("aria-pressed", String(normalize(chip.dataset.topic) === topic)));

    const filtering = Boolean(terms.length || topic);
    if (countEl) countEl.textContent = filtering ? `${shown} of ${total} posts` : `${total} posts`;
    if (emptyEl) {
      emptyEl.hidden = shown > 0;
      if (emptyQ) emptyQ.textContent = [query.trim(), topic && `in ${topic}`].filter(Boolean).join(" ");
    }

    // Keep the filter in the URL so a filtered view can be shared or reloaded.
    const url = new URL(location.href);
    if (terms.length) url.searchParams.set("q", query.trim()); else url.searchParams.delete("q");
    if (topic) url.searchParams.set("topic", topic); else url.searchParams.delete("topic");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    updateCurrentTab();
  }

  // --- search box ---
  let timer = 0;
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { query = input.value; apply(); }, 80);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { input.value = ""; query = ""; apply(); input.blur(); }
    });
  }
  if (form) form.addEventListener("submit", (e) => { e.preventDefault(); query = input.value; apply(); });
  if (clearBtn) clearBtn.addEventListener("click", () => {
    query = ""; topic = "";
    if (input) input.value = "";
    apply();
    if (input) input.focus();
  });

  // "/" focuses the search box unless the user is already typing somewhere.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || !input) return;
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
    e.preventDefault();
    input.focus();
    input.select();
  });

  // --- topic chips (one at a time; clicking the active chip clears it) ---
  chips.forEach((chip) => chip.addEventListener("click", () => {
    const value = normalize(chip.dataset.topic);
    topic = topic === value ? "" : value;
    apply();
  }));

  // --- tab clicks scroll explicitly (a plain hash jump can be dropped while a
  //     previous smooth scroll is still running) ---
  tabs.forEach((tab) => tab.addEventListener("click", (e) => {
    const target = document.getElementById((tab.getAttribute("href") || "").slice(1));
    if (!target) return;
    e.preventDefault();
    history.pushState(null, "", tab.getAttribute("href"));
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  // --- section tabs follow the scroll position ---
  function updateCurrentTab() {
    const offset = (header ? header.offsetHeight : 0) + 24;
    let current = null;
    for (const s of sections) {
      if (s.container.hidden) continue;
      if (!current) current = s;
      if (s.heading.getBoundingClientRect().top - offset <= 0) current = s;
    }
    tabs.forEach((tab) => {
      if (current && tab.getAttribute("href") === "#" + current.heading.id) tab.setAttribute("aria-current", "true");
      else tab.removeAttribute("aria-current");
    });
  }
  // Fade the right edge of the tab row only while it can still scroll.
  const tabRow = document.querySelector(".blog-tabs");
  function updateOverflow() {
    if (!tabRow) return;
    const more = tabRow.scrollWidth - tabRow.clientWidth - tabRow.scrollLeft > 4;
    tabRow.classList.toggle("is-overflowing", more);
  }
  if (tabRow) {
    tabRow.addEventListener("scroll", updateOverflow, { passive: true });
    window.addEventListener("resize", updateOverflow, { passive: true });
    updateOverflow();
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { updateCurrentTab(); ticking = false; });
  }, { passive: true });

  // --- whole card is clickable (mouse, Enter, Space) ---
  const activateCard = (card, target) => {
    const link = card.querySelector(".card-footer a, a");
    if (link && target !== link && !link.contains(target)) link.click();
  };
  root.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) activateCard(card, e.target);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (card && e.target === card) { e.preventDefault(); activateCard(card, e.target); }
  });

  // --- initial state from the URL (?q=…&topic=…) ---
  const params = new URLSearchParams(location.search);
  query = params.get("q") || "";
  topic = normalize(params.get("topic"));
  if (input && query) input.value = query;
  apply();

  // Re-run the fragment jump once the filter has been applied, so a shared link
  // like blog.html?q=penguin#books (or a tab link opened in a new tab) lands on
  // the section rather than wherever the browser scrolled before layout settled.
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
})();
