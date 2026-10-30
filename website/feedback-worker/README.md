# Discord feedback endpoint

The static website calls this Worker. The Discord webhook stays in the existing DISCORD_WEBHOOK_URL Worker secret, never in frontend assets.

## Deployment

1. Keep the existing secret; do not paste its value into source or logs.
2. Run `npx wrangler deploy` in this directory. wrangler.toml binds FEEDBACK_LIMITER and migrates its SQLite Durable Object class automatically.
3. ALLOWED_ORIGIN is a comma-separated list of exact origins without trailing slashes. The current list allows localhost:3000 and yeazka.github.io.
4. The website FEEDBACK_ENDPOINT stays unchanged. Validate OPTIONS and rejected requests without sending test messages to Discord. End-to-end delivery tests send a real message and need an explicitly authorized test.

Each hashed-IP Durable Object allows five submissions in a fixed one-hour window. Quota consumption is transactional across concurrent requests. Failed Discord deliveries also consume a slot to avoid retry storms. Storage failures return JSON 503 with CORS. Bodies are capped at 6000 bytes while streaming; Discord mentions are disabled.

The previous FEEDBACK_RATE KV namespace is no longer used; deployment does not delete its stored data. Origin checks protect browser usage, not arbitrary HTTP clients. Larger launches may also need Turnstile/WAF rules to reduce distributed abuse.
