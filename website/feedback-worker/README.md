# Discord feedback endpoint

The website is static. Never paste a Discord webhook into `index.html`: visitors can read it. This Worker accepts the website form, validates it, limits requests with Cloudflare KV, and forwards to Discord using a Worker secret.

1. Create a Discord channel webhook. Keep its full URL private.
2. Create a Cloudflare KV namespace named `FEEDBACK_RATE` and a Worker using `worker.js`.
3. Bind the KV namespace as `FEEDBACK_RATE`. Set `ALLOWED_ORIGIN` to the exact website origin, without a trailing slash. Set `DISCORD_WEBHOOK_URL` as a Worker **Secret**, not a plaintext variable.
4. Deploy the Worker. Test `POST /feedback` from the real website origin, then set `FEEDBACK_ENDPOINT` in `../index.html` to the public Worker URL ending in `/feedback`.
5. Recheck that neither the website bundle nor the GitHub source export contains the webhook URL.

The form stays disabled while `FEEDBACK_ENDPOINT` is empty. The current worker allows at most five requests per IP per hour; Cloudflare KV is eventually consistent, so add Turnstile or WAF rules before a large public launch.
