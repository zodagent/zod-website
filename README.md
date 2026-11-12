# zod-website

Public marketing & documentation site for Zod, a local-first agent workspace (desktop app and Chrome extension). Zod is proprietary software, available by invitation while it is in beta.

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
- `/company/investors` is the pitch, one slide per page (`src/components/company/investors/`): cover, problem, solution, market, competition, product, advantages, features, traction, business model, forecast, raise, use of funds, team, advisors, thank you. Figures only the founders know (raised to date, the round, usage) are "shared on request" until they are filled in; the use-of-funds split and the plans on the business-model page are the plan, edit them as it changes
- Site copy reflects the product: local-first, any OpenAI-compatible model, no account. Zod is closed source and has no public pricing: calls to action are "Book a demo" (`/book-a-demo`)
- Only the desktop app and the Chrome extension are available; the browser version, self-hosting and the CLI are marked "coming soon"
- The screenshots in `src/assets/images/screens` and the slideshows in `src/assets/images/slides` are real captures of the app
- `src/app-details.md` is the internal source of truth and must not be referenced in site copy
