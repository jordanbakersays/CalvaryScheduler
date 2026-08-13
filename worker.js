// Cloudflare Worker entry point (Workers + Static Assets model).
// Handles POST /send-reminders itself; everything else falls through
// to the static files (index.html, etc.) via the ASSETS binding.
//
// Requires these to be set as this Worker's environment variables/secrets
// (set via `wrangler secret put`, not the dashboard, so they survive
// git-triggered redeploys):
//   BREVO_API_KEY   - your Brevo API key (Settings -> SMTP & API -> API Keys in Brevo)
//   FROM_EMAIL       - the "from" address, e.g. barn@cbcjoy.org
//                       (must be a verified sender in Brevo -- Settings ->
//                       Senders, Domains & Dedicated IPs -- no DNS/domain
//                       verification required, just click the email link)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/send-reminders" && request.method === "POST") {
      return handleSendReminders(request, env);
    }

    // Everything else: serve the static files (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};

async function handleSendReminders(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const reminders = Array.isArray(body.reminders) ? body.reminders : [];
  if (reminders.length === 0) {
    return json({ error: "No reminders provided" }, 400);
  }

  const MINISTRY_LABELS = {
    students: "Calvary Students",
    kids: "Calvary Kids",
  };
  const ministryLabel = MINISTRY_LABELS[body.ministryKey] || "the team";

  if (!env.BREVO_API_KEY) {
    return json({ error: "BREVO_API_KEY is not configured on this Worker" }, 500);
  }

  const fromEmail = env.FROM_EMAIL || "barn@cbcjoy.org";
  const results = [];

  for (const r of reminders) {
    if (!r.email) {
      results.push({ slotId: r.slotId, ok: false, error: "missing email" });
      continue;
    }
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { email: fromEmail, name: ministryLabel },
          to: [{ email: r.email, name: r.volunteerName || undefined }],
          subject: `Reminder: you're scheduled ${formatDate(r.date)}`,
          textContent: buildMessage(r, ministryLabel),
        }),
      });
      const data = await res.json().catch(() => ({}));
      results.push({ slotId: r.slotId, ok: res.ok, data });
    } catch (err) {
      results.push({ slotId: r.slotId, ok: false, error: String(err) });
    }
  }

  return json({ results });
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function buildMessage(r, ministryLabel) {
  const roleText = r.role ? ` (${r.role})` : "";
  const timeText = r.time ? ` at ${r.time}` : "";
  const firstName = (r.volunteerName || "").split(" ")[0] || "there";
  return `Hi ${firstName},\n\nJust a reminder that you're scheduled to volunteer on ${formatDate(r.date)}${timeText}${roleText}.\n\nThanks for serving with ${ministryLabel}!`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
