const CONTACT_TO_EMAIL = "cypresshighsoccer@gmail.com";

function validateContactPayload(payload) {
  const errors = {};
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const phoneDigits = String(payload.phone || "").replace(/\D/g, "");
  const message = String(payload.message || "").trim();
  const turnstileToken = String(payload.turnstileToken || "").trim();

  if (!/^[A-Za-z ]{3,}$/.test(name)) {
    errors.name = "Enter at least 3 characters using letters and spaces only.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (phoneDigits.length < 10) {
    errors.phone = "Enter a phone number with at least 10 digits.";
  }

  if (message.length < 3) {
    errors.message = "Enter a message at least 3 characters long.";
  }

  if (!turnstileToken) {
    errors.captcha = "Please complete the captcha.";
  }

  return {
    errors,
    values: {
      name,
      email,
      phone: phoneDigits,
      message,
      turnstileToken,
    },
  };
}

function formatPhone(phoneDigits) {
  const firstTen = phoneDigits.slice(0, 10);
  const extra = phoneDigits.slice(10);
  const formatted = `(${firstTen.slice(0, 3)}) ${firstTen.slice(3, 6)}-${firstTen.slice(6)}`;
  return extra ? `${formatted} x${extra}` : formatted;
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function verifyTurnstile(secret, token, ip) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
    }
  );

  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.success);
}

async function sendEmail({ apiKey, fromEmail, values }) {
  const phone = formatPhone(values.phone);
  const subject = `Cypress Boys Soccer Contact: ${values.name}`;
  const html = `
    <h2>New Cypress Boys Soccer message</h2>
    <p><strong>Name:</strong> ${htmlEscape(values.name)}</p>
    <p><strong>Email:</strong> ${htmlEscape(values.email)}</p>
    <p><strong>Phone:</strong> ${htmlEscape(phone)}</p>
    <p><strong>Message:</strong></p>
    <p>${htmlEscape(values.message).replace(/\n/g, "<br>")}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [CONTACT_TO_EMAIL],
      cc: [values.email],
      reply_to: values.email,
      subject,
      html,
    }),
  });

  return response.ok;
}

export async function onRequestPost(context) {
  const turnstileSecret = context.env.TURNSTILE_SECRET_KEY;
  const resendApiKey = context.env.RESEND_API_KEY;
  const fromEmail = context.env.CONTACT_FROM_EMAIL;

  if (!turnstileSecret || !resendApiKey || !fromEmail) {
    return Response.json(
      {
        message:
          "The contact form is not fully configured yet. Please try again later.",
      },
      { status: 503 }
    );
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch (error) {
    return Response.json(
      { message: "Please check the form and try again." },
      { status: 400 }
    );
  }

  const { errors, values } = validateContactPayload(payload);
  if (Object.keys(errors).length) {
    return Response.json(
      { message: "Please correct the highlighted fields.", errors },
      { status: 400 }
    );
  }

  const ip = context.request.headers.get("CF-Connecting-IP");
  const captchaOk = await verifyTurnstile(
    turnstileSecret,
    values.turnstileToken,
    ip
  );

  if (!captchaOk) {
    return Response.json(
      {
        message: "Captcha verification failed. Please try again.",
        errors: { captcha: "Please complete the captcha again." },
      },
      { status: 400 }
    );
  }

  const emailOk = await sendEmail({
    apiKey: resendApiKey,
    fromEmail,
    values,
  });

  if (!emailOk) {
    return Response.json(
      {
        message:
          "We could not send your message right now. Please try again shortly.",
      },
      { status: 502 }
    );
  }

  return Response.json({
    message: "Thank you. Your message was sent successfully.",
  });
}
