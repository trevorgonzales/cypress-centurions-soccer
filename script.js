const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const siteHeader = document.querySelector(".site-header");
const heroVideo = document.querySelector(".hero-video");
const heroSection = document.querySelector(".hero");
const matchSection = document.querySelector(".match-section");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const rosterToggles = document.querySelectorAll(".roster-toggle");
const rosterGrid = document.querySelector("[data-roster-grid]");
const scheduleList = document.querySelector("[data-schedule-list]");
const calendarPanel = document.querySelector("[data-calendar-panel]");
const calendarFrame = document.querySelector("[data-calendar-frame]");
const calendarEmpty = document.querySelector("[data-calendar-empty]");
const teamCalendar = document.querySelector("[data-team-calendar]");
const rosterStatus = document.querySelector("[data-roster-status]");
const nextMatchCard = document.querySelector("[data-next-match]");
const nextMatchLogo = document.querySelector("[data-next-match-logo]");
const nextMatchDate = document.querySelector("[data-next-match-date]");
const nextMatchLocation = document.querySelector("[data-next-match-location]");
const countdownSection = document.querySelector("[data-match-countdown]");
const countdownTitle = document.querySelector("[data-countdown-title]");
const countdownMonths = document.querySelector("[data-countdown-months]");
const countdownDays = document.querySelector("[data-countdown-days]");
const countdownHours = document.querySelector("[data-countdown-hours]");
const countdownMinutes = document.querySelector("[data-countdown-minutes]");
const countdownSeconds = document.querySelector("[data-countdown-seconds]");
const instagramFeed = document.querySelector("[data-instagram-feed]");
const formsList = document.querySelector("[data-forms-list]");
const formsStatus = document.querySelector("[data-forms-status]");
const galleryList = document.querySelector("[data-gallery-list]");
const galleryStatus = document.querySelector("[data-gallery-status]");
const galleryDetail = document.querySelector("[data-gallery-detail]");
const galleryDetailTitle = document.querySelector("[data-gallery-detail-title]");
const galleryDetailCaption = document.querySelector("[data-gallery-detail-caption]");
const galleryDetailStatus = document.querySelector("[data-gallery-detail-status]");
const galleryLightbox = document.querySelector("[data-gallery-lightbox]");
const galleryLightboxImage = document.querySelector("[data-gallery-lightbox-image]");
const galleryLightboxClose = document.querySelector("[data-gallery-lightbox-close]");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const turnstileContainer = document.querySelector("[data-turnstile-container]");
const copyrightYears = document.querySelectorAll("[data-current-year]");
let turnstileWidgetId = null;
let countdownTimerId = null;
let countdownMatches = [];
let activeCountdownMatch = null;
const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const upcomingGameCardLimit = 2;
let calendarMonthDate = null;

copyrightYears.forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});

function isLocalStaticPreview() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function getLocalPreviewNextMatch() {
  return {
    date: "2026-11-18",
    opponent: "Edison HS",
    time: "5:00 PM",
    location: "Edison",
    logo: "https://assets.chsboyssoccer.com/images/edison-hs.png",
  };
}

function isVarsityScheduleEvent(event) {
  const team = String(event?.team || "").trim();
  if (team) return /^varsity$/i.test(team);

  const summary = String(event?.summary || "");
  return (
    /\bVarsity\b/i.test(summary) &&
    !/\b(Jr\.?|Junior|JV)\s*Varsity\b/i.test(summary)
  );
}

function parseMatchDateTime(match) {
  if (!match?.date) return null;

  const dateMatch = String(match.date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  let hour = 12;
  let minute = 0;
  const timeMatch = String(match.time || "").match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i
  );

  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
    const period = timeMatch[3].toUpperCase();

    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
  }

  return new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    hour,
    minute
  );
}

function normalizeCountdownMatch(match) {
  if (!match) return null;
  const targetDate = parseMatchDateTime(match);
  if (!targetDate) return null;

  return {
    ...match,
    targetDate,
  };
}

function getUpcomingCountdownMatch(matches) {
  const now = new Date();

  return matches
    .map(normalizeCountdownMatch)
    .filter((match) => match && match.targetDate > now)
    .sort((a, b) => a.targetDate - b.targetDate)[0] || null;
}

function getCountdownParts(targetDate) {
  const now = new Date();
  let months = 0;
  let monthCursor = new Date(now);

  while (true) {
    const nextMonth = new Date(monthCursor);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth > targetDate) break;
    months += 1;
    monthCursor = nextMonth;
  }

  const remainingMs = Math.max(0, targetDate - monthCursor);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds - days * 60 * 60 * 24) / (60 * 60));
  const minutes = Math.floor((totalSeconds - days * 60 * 60 * 24 - hours * 60 * 60) / 60);
  const seconds = totalSeconds % 60;

  return { months, days, hours, minutes, seconds };
}

function renderCountdown(match) {
  if (!countdownSection) return;

  if (!match) {
    countdownSection.hidden = true;
    return;
  }

  const parts = getCountdownParts(match.targetDate);
  const monthUnit = document.querySelector('[data-countdown-unit="months"]');
  const dayUnit = document.querySelector('[data-countdown-unit="days"]');
  const titleParts = ["Cypress"];

  if (match.opponent) titleParts.push("vs", match.opponent);
  if (countdownTitle) countdownTitle.textContent = titleParts.join(" ");
  if (countdownMonths) countdownMonths.textContent = String(parts.months);
  if (countdownDays) countdownDays.textContent = String(parts.days);
  if (countdownHours) countdownHours.textContent = String(parts.hours);
  if (countdownMinutes) countdownMinutes.textContent = String(parts.minutes);
  if (countdownSeconds) countdownSeconds.textContent = String(parts.seconds);

  if (monthUnit) monthUnit.hidden = parts.months < 1;
  if (dayUnit) dayUnit.hidden = parts.months < 1 && parts.days < 1;
  countdownSection.hidden = false;
}

function startCountdown(matches) {
  if (!countdownSection) return;

  countdownMatches = matches;
  activeCountdownMatch = getUpcomingCountdownMatch(countdownMatches);

  if (countdownTimerId) window.clearInterval(countdownTimerId);
  renderCountdown(activeCountdownMatch);

  countdownTimerId = window.setInterval(() => {
    if (!activeCountdownMatch || activeCountdownMatch.targetDate <= new Date()) {
      activeCountdownMatch = getUpcomingCountdownMatch(countdownMatches);
    }

    renderCountdown(activeCountdownMatch);
  }, 1000);
}

async function fetchScheduleData(apiUrl = "/api/schedule") {
  const response = await fetch(apiUrl);
  if (response.ok) return response.json();

  if (isLocalStaticPreview() && apiUrl.startsWith("/")) {
    const liveResponse = await fetch(`https://www.chsboyssoccer.com${apiUrl}`);
    if (liveResponse.ok) return liveResponse.json();
  }

  throw new Error("Schedule request failed.");
}

function syncMotionPreference() {
  if (!heroVideo) return;

  if (reduceMotion.matches) {
    heroVideo.pause();
    heroVideo.removeAttribute("autoplay");
  } else {
    heroVideo.play().catch(() => {});
  }
}

syncMotionPreference();

if (typeof reduceMotion.addEventListener === "function") {
  reduceMotion.addEventListener("change", syncMotionPreference);
} else {
  reduceMotion.addListener(syncMotionPreference);
}

function revealMatchLogos() {
  if (!matchSection) return;
  matchSection.classList.add("is-visible");
}

if (matchSection) {
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealMatchLogos();
  } else {
    const matchObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealMatchLogos();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -18% 0px",
        threshold: 0.35,
      }
    );

    matchObserver.observe(matchSection);
  }
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("is-open");
    document.body.classList.toggle("is-nav-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      mainNav.classList.remove("is-open");
      document.body.classList.remove("is-nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    }
  });
}

function syncHeaderState() {
  if (!siteHeader || !document.body.classList.contains("has-hero-header")) return;

  const heroBottom = heroSection
    ? heroSection.offsetTop + heroSection.offsetHeight
    : 0;
  const headerHeight = siteHeader.offsetHeight;
  const isPastHero = window.scrollY >= Math.max(0, heroBottom - headerHeight);

  siteHeader.classList.toggle("is-past-hero", isPastHero);
}

syncHeaderState();
window.addEventListener("scroll", syncHeaderState, { passive: true });
window.addEventListener("resize", syncHeaderState);

function showRosterIssue() {
  if (!rosterStatus) return;

  rosterStatus.hidden = false;
  rosterStatus.innerHTML =
    "<p>Roster information is temporarily unavailable. We are working on fixing it.</p>";
}

function setupRosterToggle(toggle) {
  toggle.addEventListener("click", () => {
    const group = toggle.closest(".roster-group");
    if (!group) return;

    const isExpanded = group.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", String(isExpanded));
    toggle.textContent = isExpanded ? "Show Less -" : "View All +";
  });
}

function renderRosterGroups(groups) {
  if (!rosterGrid || !groups.length) return;

  rosterGrid.innerHTML = groups
    .map(
      (group) => `
        <article class="roster-group">
          <h2>${escapeHtml(group.team)}</h2>
          <ul>
            ${group.names.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}
          </ul>
          <button class="roster-toggle" type="button" aria-expanded="false">View All +</button>
        </article>
      `
    )
    .join("");

  rosterGrid
    .querySelectorAll(".roster-toggle")
    .forEach((toggle) => setupRosterToggle(toggle));
}

function showFormsIssue(message) {
  if (!formsStatus) return;

  formsStatus.hidden = false;
  formsStatus.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderForms(forms) {
  if (!formsList) return;

  if (!forms.length) {
    formsList.innerHTML = `
      <a class="form-panel" href="#" aria-disabled="true">
        <span class="form-panel-name">Forms coming soon</span>
        <span class="form-panel-action">Check back shortly</span>
      </a>
    `;
    return;
  }

  formsList.innerHTML = forms
    .map(
      (form) => `
        <a class="form-panel" href="${escapeHtml(form.url)}" target="_blank" rel="noopener">
          <span class="form-panel-name">${escapeHtml(form.name)}</span>
          <span class="form-panel-action">Open form</span>
        </a>
      `
    )
    .join("");
}

function truncateText(value, limit = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}...` : text;
}

function renderInstagramPosts(posts) {
  if (!instagramFeed) return;

  if (!posts.length) {
    instagramFeed.innerHTML = `
      <div class="instagram-empty">
        <p>Instagram posts will appear here soon.</p>
      </div>
    `;
    return;
  }

  instagramFeed.innerHTML = posts
    .map(
      (post) => `
        <a class="instagram-card" href="${escapeHtml(post.permalink)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(truncateText(post.caption, 90) || "Instagram post")}">
          <span>${escapeHtml(truncateText(post.caption) || "View on Instagram")}</span>
        </a>
      `
    )
    .join("");
}

function showGalleryIssue(message) {
  if (!galleryStatus) return;

  galleryStatus.hidden = false;
  galleryStatus.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function showGalleryDetailIssue(message) {
  if (!galleryDetailStatus) return;

  galleryDetailStatus.hidden = false;
  galleryDetailStatus.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function renderGalleryCollections(galleries) {
  if (!galleryList) return;

  if (!galleries.length) {
    galleryList.innerHTML = `
      <article class="gallery-empty">
        <p>Gallery collections will appear here soon.</p>
      </article>
    `;
    return;
  }

  galleryList.innerHTML = galleries
    .map((gallery) => {
      const title = gallery.title || gallery.category || "Cypress Boys Soccer";
      const caption = gallery.caption || gallery.category || "";
      const href = `gallery-detail.html?id=${encodeURIComponent(gallery.id)}`;

      return `
        <a class="gallery-card gallery-collection-card" href="${escapeHtml(href)}">
          <img src="${escapeHtml(gallery.coverImageUrl)}" alt="${escapeHtml(title)}" loading="lazy">
          <span class="gallery-card-copy">
            <h2>${escapeHtml(title)}</h2>
            ${caption ? `<p>${escapeHtml(caption)}</p>` : ""}
            <span class="gallery-photo-count">${Number(gallery.photoCount || 0)} photos</span>
          </span>
        </a>
      `;
    })
    .join("");
}

function getSelectedGalleryId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function openGalleryLightbox(imageUrl, altText) {
  if (!galleryLightbox || !galleryLightboxImage) return;

  galleryLightboxImage.src = imageUrl;
  galleryLightboxImage.alt = altText;
  galleryLightbox.hidden = false;
  document.body.classList.add("has-gallery-lightbox");
  galleryLightboxClose?.focus();
}

function closeGalleryLightbox() {
  if (!galleryLightbox || !galleryLightboxImage) return;

  galleryLightbox.hidden = true;
  galleryLightboxImage.src = "";
  galleryLightboxImage.alt = "";
  document.body.classList.remove("has-gallery-lightbox");
}

function setupGalleryLightbox() {
  if (!galleryLightbox) return;

  galleryLightbox.addEventListener("click", (event) => {
    if (
      event.target === galleryLightbox ||
      event.target === galleryLightboxClose
    ) {
      closeGalleryLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !galleryLightbox.hidden) {
      closeGalleryLightbox();
    }
  });
}

function renderGalleryDetail(gallery) {
  if (!galleryDetail) return;

  if (!gallery) {
    galleryDetail.innerHTML = `
      <article class="gallery-empty">
        <p>Gallery collection not found.</p>
      </article>
    `;
    return;
  }

  if (galleryDetailTitle) galleryDetailTitle.textContent = gallery.title;
  if (galleryDetailCaption) {
    galleryDetailCaption.textContent =
      gallery.caption || "Images created by AM8 Media - Angel Martinez.";
  }
  document.title = `${gallery.title} | Cypress High Soccer`;

  galleryDetail.innerHTML = gallery.photos
    .map((photo) => {
      const alt = photo.alt || gallery.title;

      return `
        <button class="gallery-photo-card" type="button" data-full-image="${escapeHtml(photo.imageUrl)}" data-alt="${escapeHtml(alt)}">
          <img src="${escapeHtml(photo.imageUrl)}" alt="${escapeHtml(alt)}" loading="lazy">
        </button>
      `;
    })
    .join("");

  galleryDetail.querySelectorAll(".gallery-photo-card").forEach((button) => {
    button.addEventListener("click", () => {
      openGalleryLightbox(button.dataset.fullImage || "", button.dataset.alt || "");
    });
  });
}

async function loadGallery() {
  if (!galleryList?.dataset.galleryApi) return;
  if (window.location.protocol === "file:") return;

  try {
    const response = await fetch(galleryList.dataset.galleryApi);
    if (!response.ok) throw new Error("Gallery request failed.");

    const data = await response.json();
    renderGalleryCollections(data.galleries || []);
  } catch (error) {
    showGalleryIssue("Gallery photos are temporarily unavailable. We are working on fixing it.");
  }
}

async function loadGalleryDetail() {
  if (!galleryDetail?.dataset.galleryApi) return;
  if (window.location.protocol === "file:") return;

  const selectedGalleryId = getSelectedGalleryId();
  if (!selectedGalleryId) {
    renderGalleryDetail(null);
    return;
  }

  try {
    const response = await fetch(galleryDetail.dataset.galleryApi);
    if (!response.ok) throw new Error("Gallery request failed.");

    const data = await response.json();
    const gallery = (data.galleries || []).find(
      (item) => item.id === selectedGalleryId
    );

    renderGalleryDetail(gallery);
  } catch (error) {
    showGalleryDetailIssue("Gallery photos are temporarily unavailable. We are working on fixing it.");
  }
}

async function loadInstagramFeed() {
  if (!instagramFeed?.dataset.instagramApi) return;
  if (window.location.protocol === "file:") return;

  try {
    const response = await fetch(instagramFeed.dataset.instagramApi);
    if (!response.ok) throw new Error("Instagram request failed.");

    const data = await response.json();
    renderInstagramPosts(data.posts || []);
  } catch (error) {
    renderInstagramPosts([]);
  }
}

async function loadForms() {
  if (!formsList?.dataset.formsApi) return;
  if (window.location.protocol === "file:") return;

  try {
    const response = await fetch(formsList.dataset.formsApi);
    if (!response.ok) throw new Error("Forms request failed.");

    const data = await response.json();
    renderForms(data.forms || []);
  } catch (error) {
    showFormsIssue("Forms are temporarily unavailable. We are working on fixing it.");
  }
}

async function loadRoster() {
  if (!rosterGrid?.dataset.rosterApi) return;
  if (window.location.protocol === "file:") return;

  try {
    const response = await fetch(rosterGrid.dataset.rosterApi);
    if (!response.ok) throw new Error("Roster request failed.");

    const data = await response.json();
    if (!data.groups?.length) throw new Error("Roster is empty.");

    renderRosterGroups(data.groups);
  } catch (error) {
    showRosterIssue();
  }
}

rosterToggles.forEach((toggle) => setupRosterToggle(toggle));
loadRoster();
loadForms();
setupGalleryLightbox();
loadGallery();
loadGalleryDetail();
loadInstagramFeed();

function formatGameDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return dateValue;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMonthLabel(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getContactConfig() {
  return window.CHS_CONTACT || {};
}

function setFieldError(fieldName, message) {
  const field = contactForm?.elements[fieldName];
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);

  if (field) {
    field.setAttribute("aria-invalid", message ? "true" : "false");
  }

  if (error) {
    error.textContent = message || "";
  }
}

function setContactStatus(message, type) {
  if (!contactStatus) return;

  contactStatus.textContent = message || "";
  contactStatus.classList.toggle("is-success", type === "success");
  contactStatus.classList.toggle("is-error", type === "error");
}

function getPhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatPhoneInput(value) {
  const digits = getPhoneDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function validateContactForm() {
  if (!contactForm) return null;

  const formData = new FormData(contactForm);
  const values = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: getPhoneDigits(formData.get("phone")),
    message: String(formData.get("message") || "").trim(),
    turnstileToken: String(formData.get("cf-turnstile-response") || "").trim(),
  };

  const errors = {};
  if (!/^[A-Za-z ]{3,}$/.test(values.name)) {
    errors.name = "Enter at least 3 characters using letters and spaces only.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.phone.length < 10) {
    errors.phone = "Enter a phone number with at least 10 digits.";
  }

  if (values.message.length < 3) {
    errors.message = "Enter a message at least 3 characters long.";
  }

  if (!values.turnstileToken) {
    errors.captcha = "Please complete the captcha.";
  }

  ["name", "email", "phone", "message", "captcha"].forEach((field) => {
    setFieldError(field, errors[field]);
  });

  return {
    isValid: !Object.keys(errors).length,
    values,
  };
}

function initContactForm() {
  if (!contactForm) return;

  const phoneInput = contactForm.elements.phone;
  const submitButton = contactForm.querySelector(".contact-submit");
  const contactConfig = getContactConfig();

  if (phoneInput) {
    phoneInput.addEventListener("input", () => {
      phoneInput.value = formatPhoneInput(phoneInput.value);
    });
  }

  if (turnstileContainer && window.turnstile && contactConfig.turnstileSiteKey) {
    turnstileWidgetId = window.turnstile.render(turnstileContainer, {
      sitekey: contactConfig.turnstileSiteKey,
    });
  } else {
    setFieldError("captcha", "Captcha will be available after setup.");
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setContactStatus("", "");

    const validation = validateContactForm();
    if (!validation?.isValid) {
      setContactStatus("Please correct the highlighted fields.", "error");
      return;
    }

    if (window.location.protocol === "file:") {
      setContactStatus(
        "Form submission will work after the site is deployed to Cloudflare Pages.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
      const response = await fetch(contactConfig.contactApiUrl || "/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validation.values),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        Object.entries(data.errors || {}).forEach(([field, message]) => {
          setFieldError(field, message);
        });
        throw new Error(data.message || "We could not send your message.");
      }

      contactForm.reset();
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
      setContactStatus(
        data.message || "Thank you. Your message was sent successfully.",
        "success"
      );
    } catch (error) {
      setContactStatus(
        error.message || "We could not send your message right now. Please try again shortly.",
        "error"
      );
      if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  });
}

function getFutureEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (events || [])
    .filter((event) => {
      const eventDate = new Date(`${event.date}T00:00:00`);
      return !Number.isNaN(eventDate.valueOf()) && eventDate >= today;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getDateFromValue(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function getTeamLabel(event) {
  const value = String(event.team || event.summary || "").trim();
  const labels = [
    ["Fresh/Soph", /\b(fresh\s*\/?\s*soph|frosh|fs)\b/i],
    ["Jr. Varsity", /\b(jr\.?\s*varsity|junior\s*varsity|jv)\b/i],
    ["Varsity", /\bvarsity\b/i],
  ];

  const match = labels.find(([, pattern]) => pattern.test(value));
  return match ? match[0] : value || "Game";
}

function getTeamSortValue(event) {
  const label = getTeamLabel(event);
  const order = {
    "Fresh/Soph": 0,
    "Jr. Varsity": 1,
    Varsity: 2,
  };

  return order[label] ?? 3;
}

function groupEventsByDate(events) {
  const groups = new Map();

  events.forEach((event) => {
    if (!event.date) return;
    if (!groups.has(event.date)) groups.set(event.date, []);
    groups.get(event.date).push(event);
  });

  return Array.from(groups, ([date, games]) => {
    const firstGame = games[0] || {};
    const hasOneOpponent = games.every((game) => game.opponent === firstGame.opponent);
    const hasOneLocation = games.every((game) => game.location === firstGame.location);

    return {
      date,
      opponent: hasOneOpponent ? firstGame.opponent : "Multiple games",
      location: hasOneLocation ? firstGame.location : "Multiple locations",
      games: [...games].sort((a, b) => getTeamSortValue(a) - getTeamSortValue(b)),
    };
  });
}

function renderScheduleCards(events) {
  if (!scheduleList) return;

  if (!events.length) {
    if (calendarPanel) calendarPanel.hidden = true;
    scheduleList.innerHTML = '<div class="schedule-empty"><p>No games scheduled.</p></div>';
    renderTeamCalendar([]);
    return;
  }

  if (calendarPanel) calendarPanel.hidden = false;

  const groupedEvents = groupEventsByDate(events);
  const visibleGroups = groupedEvents.slice(0, upcomingGameCardLimit);
  const hasMoreEvents = groupedEvents.length > visibleGroups.length;

  scheduleList.innerHTML =
    visibleGroups
      .map(
        (group) => `
          <article class="game-card">
            <time class="game-date" datetime="${escapeHtml(group.date)}">${escapeHtml(formatGameDate(group.date))}</time>
            <h3 class="game-title">${escapeHtml(group.opponent)}</h3>
            <div class="game-meta">
              <span>${escapeHtml(group.location || "Location TBD")}</span>
            </div>
            <ul class="game-team-list">
              ${group.games
                .map(
                  (game) => `
                    <li>
                      <span class="game-team">${escapeHtml(getTeamLabel(game))}</span>
                      <span class="game-time">${escapeHtml(game.time || "Time TBD")}</span>
                      ${
                        group.opponent === "Multiple games"
                          ? `<span class="game-opponent">${escapeHtml(game.opponent || "Opponent TBD")}</span>`
                          : ""
                      }
                    </li>
                  `
                )
                .join("")}
            </ul>
          </article>
        `
      )
      .join("") +
    (hasMoreEvents
      ? '<p class="schedule-more-note">See calendar for more upcoming games.</p>'
      : "");

  renderTeamCalendar(events);
}

function getMonthEvents(events, monthDate) {
  return events.filter((event) => {
    const eventDate = getDateFromValue(event.date);
    return (
      eventDate &&
      eventDate.getFullYear() === monthDate.getFullYear() &&
      eventDate.getMonth() === monthDate.getMonth()
    );
  });
}

function renderCalendarDay(date, currentMonth, eventsByDate) {
  const dateKey = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const events = eventsByDate.get(dateKey) || [];
  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();

  return `
    <div class="calendar-day${isCurrentMonth ? "" : " is-muted"}${events.length ? " has-games" : ""}">
      <time datetime="${dateKey}">${date.getDate()}</time>
      ${
        events.length
          ? `<ul>${events
              .map(
                (event) => `
                  <li>
                    <span>${escapeHtml(getTeamLabel(event))}</span>
                    <span>${escapeHtml(event.time || "Time TBD")}</span>
                  </li>
                `
              )
              .join("")}</ul>`
          : ""
      }
    </div>
  `;
}

function renderTeamCalendar(events) {
  if (!teamCalendar || !calendarEmpty || !calendarFrame) return;

  if (!events.length) {
    teamCalendar.hidden = true;
    calendarEmpty.hidden = false;
    return;
  }

  const firstEventDate = getDateFromValue(events[0].date) || new Date();
  if (!calendarMonthDate) {
    calendarMonthDate = new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1);
  }

  const monthEvents = getMonthEvents(events, calendarMonthDate);
  const eventsByDate = new Map();
  monthEvents.forEach((event) => {
    if (!eventsByDate.has(event.date)) eventsByDate.set(event.date, []);
    eventsByDate.get(event.date).push(event);
  });

  const monthStart = new Date(
    calendarMonthDate.getFullYear(),
    calendarMonthDate.getMonth(),
    1
  );
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return renderCalendarDay(date, calendarMonthDate, eventsByDate);
  });

  calendarFrame.hidden = true;
  calendarEmpty.hidden = true;
  teamCalendar.hidden = false;
  teamCalendar.innerHTML = `
    <div class="calendar-toolbar">
      <button type="button" data-calendar-prev>Prev</button>
      <h3>${escapeHtml(formatMonthLabel(calendarMonthDate))}</h3>
      <button type="button" data-calendar-next>Next</button>
    </div>
    <div class="calendar-weekdays" aria-hidden="true">
      <span>Sun</span>
      <span>Mon</span>
      <span>Tue</span>
      <span>Wed</span>
      <span>Thu</span>
      <span>Fri</span>
      <span>Sat</span>
    </div>
    <div class="calendar-grid">
      ${days.join("")}
    </div>
  `;

  teamCalendar.querySelector("[data-calendar-prev]")?.addEventListener("click", () => {
    calendarMonthDate = new Date(
      calendarMonthDate.getFullYear(),
      calendarMonthDate.getMonth() - 1,
      1
    );
    renderTeamCalendar(events);
  });

  teamCalendar.querySelector("[data-calendar-next]")?.addEventListener("click", () => {
    calendarMonthDate = new Date(
      calendarMonthDate.getFullYear(),
      calendarMonthDate.getMonth() + 1,
      1
    );
    renderTeamCalendar(events);
  });
}

function renderNextVarsityMatch(match) {
  if (!nextMatchCard) return;

  nextMatchCard.classList.remove("is-loading");
  nextMatchCard.setAttribute("aria-busy", "false");

  if (!match) {
    if (nextMatchDate) nextMatchDate.textContent = "Schedule coming soon";
    if (nextMatchLocation) {
      nextMatchLocation.textContent = "Check back for the next match";
    }
    if (nextMatchLogo) {
      nextMatchLogo.src = transparentPixel;
      nextMatchLogo.alt = "";
      nextMatchLogo.setAttribute("aria-hidden", "true");
    }
    nextMatchCard.setAttribute("aria-label", "Upcoming match schedule coming soon");
    return;
  }

  if (nextMatchDate) {
    nextMatchDate.textContent = formatGameDate(match.date);
  }

  if (nextMatchLocation) {
    nextMatchLocation.textContent = match.location || match.opponent || "Location TBD";
  }

  if (nextMatchLogo) {
    nextMatchLogo.src = match.logo || transparentPixel;
    nextMatchLogo.alt = match.logo ? match.opponent || "Upcoming opponent" : "";
    nextMatchLogo.toggleAttribute("aria-hidden", !match.logo);
  }

  const labelParts = ["Upcoming match"];
  if (match.opponent) labelParts.push(`against ${match.opponent}`);
  if (match.location) labelParts.push(`at ${match.location}`);
  nextMatchCard.setAttribute("aria-label", labelParts.join(" "));
}

async function renderSchedule() {
  const schedule = window.CHS_SCHEDULE;
  if (!schedule) return;

  if (calendarFrame && calendarEmpty && schedule.googleCalendarEmbedUrl) {
    calendarFrame.src = schedule.googleCalendarEmbedUrl;
    calendarFrame.hidden = false;
    calendarEmpty.hidden = true;
  }

  if (!scheduleList) return;

  scheduleList.innerHTML = '<div class="schedule-empty"><p>Loading games...</p></div>';

  if (schedule.scheduleApiUrl) {
    try {
      const data = await fetchScheduleData(schedule.scheduleApiUrl);
      renderScheduleCards(data.events || []);
      return;
    } catch (error) {
      // Local file previews cannot call Cloudflare Pages Functions.
    }
  }

  renderScheduleCards(getFutureEvents(schedule.events));
}

renderSchedule();

async function loadNextMatch() {
  if (!nextMatchCard || window.location.protocol === "file:") return;

  try {
    const data = await fetchScheduleData("/api/schedule");
    const varsityMatches = (data.events || []).filter(isVarsityScheduleEvent);
    const countdownMatch =
      getUpcomingCountdownMatch(varsityMatches) ||
      normalizeCountdownMatch(data.nextVarsityMatch);

    renderNextVarsityMatch(countdownMatch || data.nextVarsityMatch);
    startCountdown(countdownMatch ? varsityMatches : [data.nextVarsityMatch]);
  } catch (error) {
    const fallbackMatch = isLocalStaticPreview() ? getLocalPreviewNextMatch() : null;
    renderNextVarsityMatch(fallbackMatch);
    startCountdown(fallbackMatch ? [fallbackMatch] : []);
  }
}

loadNextMatch();
initContactForm();
