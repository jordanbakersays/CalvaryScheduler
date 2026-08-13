// Cloudflare Worker entry point (Workers + Static Assets model).
// Handles POST /send-reminders itself; everything else falls through
// to the static files (index.html, etc.) via the ASSETS binding.
//
// Requires these to be set as this Worker's environment variables/secrets
// (Cloudflare dashboard -> your Worker -> Settings -> Variables and Secrets):
//   RESEND_API_KEY   - your Resend API key
//   FROM_EMAIL        - the "from" address, e.g. reminders@yourdomain.com
//                        (must be on a domain you've verified in Resend,
//                        or use Resend's onboarding@resend.dev for testing)

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

  if (!env.RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY is not configured on this Worker" }, 500);
  }

  const fromEmail = env.FROM_EMAIL || "onboarding@resend.dev";
  const results = [];

  for (const r of reminders) {
    if (!r.email) {
      results.push({ slotId: r.slotId, ok: false, error: "missing email" });
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: r.email,
          subject: `Reminder: you're scheduled ${formatDate(r.date)}`,
          text: buildMessage(r, ministryLabel),
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
  const firstName = (r.volunteerName || "").split(" ")[0] || "there";
  return `Hi ${firstName},\n\nJust a reminder that you're scheduled to volunteer on ${formatDate(r.date)} at ${r.time}${roleText}.\n\nThanks for serving with ${ministryLabel}!`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
