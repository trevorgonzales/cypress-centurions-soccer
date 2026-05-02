const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const heroVideo = document.querySelector(".hero-video");
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
const formsList = document.querySelector("[data-forms-list]");
const formsStatus = document.querySelector("[data-forms-status]");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const turnstileContainer = document.querySelector("[data-turnstile-container]");
let turnstileWidgetId = null;
const transparentPixel =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const upcomingGameCardLimit = 2;
let calendarMonthDate = null;

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
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  });

  mainNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
    }
  });
}

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
      const response = await fetch(schedule.scheduleApiUrl);
      if (response.ok) {
        const data = await response.json();
        renderScheduleCards(data.events || []);
        return;
      }
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
    const response = await fetch("/api/schedule");
    if (!response.ok) {
      renderNextVarsityMatch(null);
      return;
    }

    const data = await response.json();
    renderNextVarsityMatch(data.nextVarsityMatch);
  } catch (error) {
    renderNextVarsityMatch(null);
  }
}

loadNextMatch();
initContactForm();
