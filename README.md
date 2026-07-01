# zod-website

Public marketing & documentation site for the zod platform.

Part of the [zodagent](https://github.com/zodagent) ecosystem.

## Status

Scaffolding.

## Stack (planned)

- Static site, no bundler
- Tailwind v4 + daisyUI v5 (matches the apps)
- [Zinc](../zinc) for any interactive components
- [Zixi](../zixi) for content swaps
- [Zlog](../zlog) for diagnostics

## Layout

```
src/
  components/             -- HTML partial components
  pages/                  -- HTML page entries
  partials/               -- shared partials (head, header, footer, logo)
  css/
    input.css             -- Tailwind v4 + custom styles
  app.js                  -- Main JS entry (Alpine.js, Lucide icons)
  assets/                 -- fonts, images, logos
```

## Conventions

- Same `z-*` / `zx-*` attribute patterns as the apps so docs can embed live examples
- All pages pre-rendered to static HTML; no SPA router needed
