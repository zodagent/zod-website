# zod-website

Public marketing & documentation site for Zod Agent — a client-side, agentic AI chat workspace that runs in your browser.

Part of the [zodagent](https://github.com/zodagent) ecosystem.

## Status

Production marketing + docs site.

## Stack

- Vite static build (HTML partials with `@import` custom syntax)
- Tailwind v4 + daisyUI v5 tokens (matches the apps)
- Lucide icons + Alpine.js
- No SPA router; pages pre-rendered to static HTML

## Layout

```
src/
  components/             -- HTML partial components (marketing + docs pages)
  pages/                  -- HTML page entries
  partials/               -- shared partials (head, header, footer, resource-header)
  css/
    input.css             -- Tailwind v4 + custom styles
  app.js                  -- Main JS entry (Alpine.js, Lucide icons, provider names)
  app-details.md          -- Internal product source-of-truth (untracked, not site copy)
  assets/                 -- fonts, images, logos
```

## Build

```bash
npm run build
```

Copies `dist/src/pages/*` to `dist/` so routes like `/product/web` serve `product/web.html`.

## Conventions

- Marketing pages use `src/partials/header.html`; docs pages use `src/partials/resource-header.html`
- Internal links must target allowed routes (`/product*`, `/resources/docs*`, `/company/*`, `/legal/*`, etc.) — run the link check before committing
- Site copy reflects the product: local-first, any OpenAI-compatible API, no backend, no account
- `src/app-details.md` is the internal source of truth and must not be referenced in site copy
