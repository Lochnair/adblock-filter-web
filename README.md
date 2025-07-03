# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## DNS record tool

This app stores DNS records in a Cloudflare D1 database and exposes them as
AdGuard filter rules. The following
record types are supported:

- `A`, `AAAA`, `CNAME`, `HTTPS`, `MX`, `PTR`, `SRV`, and `TXT`.

Rules are emitted in the form `hostname$dnsrewrite=NOERROR;TYPE;VALUE`. For
`HTTPS` records you may supply additional parameters such as `alpn`, `port` and
`ipv4hint` as supported by AdGuard.

Example rules:

```
ha.oandc.fun$dnsrewrite=NOERROR;A;172.20.20.2
ha.oandc.fun$dnsrewrite=NOERROR;HTTPS;32 . alpn=h3 ipv4hint=172.20.20.2
```

## Database setup

Migrations are stored in `drizzle/migrations`. Generate a migration and apply it
to your Cloudflare D1 database:

```bash
pnpm dlx drizzle-kit generate
wrangler d1 migrations apply agh-dns-records
```

This creates the required `dns_records` table so the app can run without errors.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Running locally

Install dependencies and start the dev server:

```bash
pnpm install
pnpm run dev
```

Configure Cloudflare D1 bindings as shown in `wrangler.jsonc` before using `wrangler dev` or deploying.
