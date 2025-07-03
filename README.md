# Adblock Filter Web

A SvelteKit application that manages DNS records and publishes them as AdGuard filter rules. Records are stored in a Cloudflare D1 database and can be consumed by AdGuard Home for DNS rewrites.

## Motivation

AdGuard Home does not forward SOA lookups to upstream resolvers. ACME clients need SOA responses during certificate issuance, so DNS rewrites alone break automation. By serving DNS records as an AdGuard filter, this project answers those lookups directly and allows ACME clients to validate domains. The same filter lists can be reused on multiple AGH instances without additional sync tooling.

## Supported record types

- `A`, `AAAA`, `CNAME`, `HTTPS`, `MX`, `PTR`, `SRV`, and `TXT`

Records are emitted as `hostname$dnsrewrite=NOERROR;TYPE;VALUE`. `HTTPS` records may include `alpn`, `port` and `ipv4hint` parameters supported by AdGuard.

### Limitations

- Only the record types above are supported. Queries for other types are blocked from reaching upstream resolvers.
- SOA queries are always forwarded so certificate automation continues to work.

## Database setup

Migrations live in `drizzle/migrations`. To create the required tables, run:

```bash
pnpm dlx drizzle-kit generate
wrangler d1 migrations apply agh-dns-records
```

## Development

1. Copy `.env.example` to `.env` and adjust `DATABASE_URL` if needed.
2. Install dependencies with `pnpm install`.
3. Start the dev server with `pnpm run dev`.

The filter list is available at `/filter.txt` when the server is running.

## Build and deploy

Create a production build and deploy to Cloudflare Workers:

```bash
pnpm run build
wrangler deploy
```

Use `pnpm run preview` to preview the production build locally.
