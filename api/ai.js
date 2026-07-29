// Vercel serverless function. The browser calls /api/ai; the Anthropic key
// lives only here, in an environment variable, and never reaches the client.
// This powers receipt OCR, barcode reading, recipe suggestions and the saving plan.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "server missing ANTHROPIC_API_KEY" });
    return;
  }
  try {
    const { content } = req.body || {};
    if (!content) { res.status(400).json({ error: "missing content" }); return; }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: data.error ? data.error.message : "upstream error" });
      return;
    }
    res.status(200).json({ content: data.content || [] });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
