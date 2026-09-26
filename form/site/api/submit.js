// 導入アンケートの回答を運営コンソール(nightwork-pos)へ中継する。
//
// ブラウザ(form/site/index.html)は同一オリジンのこの関数だけを叩く。共有シークレット
// (ONBOARDING_SURVEY_WEBHOOK_SECRET)はこの関数のサーバ側環境変数にだけ置き、ブラウザには
// 一切渡さない(クライアントJSに秘密を持たせると誰でもソースを見て盗める。CLAUDE.md参照)。
//
// Vercel(プロジェクト pokkiri-night-survey・rootDirectory form/site)配下の
// ゼロコンフィグNode関数として、`/api/submit` で呼べる。

const DEFAULT_TARGET = "https://nightwork-pos.vercel.app/api/onboarding-survey";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method not allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (
    !body ||
    typeof body.storeName !== "string" ||
    typeof body.submittedAt !== "string" ||
    !Array.isArray(body.answers)
  ) {
    res.status(400).json({ ok: false, error: "invalid payload" });
    return;
  }

  const secret = process.env.ONBOARDING_SURVEY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[submit] ONBOARDING_SURVEY_WEBHOOK_SECRET is not set");
    res.status(500).json({ ok: false, error: "server not configured" });
    return;
  }
  const target = process.env.NIGHTWORK_POS_WEBHOOK_URL || DEFAULT_TARGET;

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
    });
    if (!upstream.ok) {
      console.error("[submit] upstream responded", upstream.status, await upstream.text().catch(() => ""));
      res.status(502).json({ ok: false, error: "upstream error" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[submit] upstream unreachable", e);
    res.status(502).json({ ok: false, error: "upstream unreachable" });
  }
};
