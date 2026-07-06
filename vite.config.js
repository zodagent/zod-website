import { defineConfig } from 'vite'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pagesDir = resolve(__dirname, 'src/pages')

const INCLUDE_RE = /<!--\s*@import\s+"([^"]+)"\s*-->/g

function resolveIncludes(html, baseDir, depth = 0) {
  if (depth > 10) throw new Error('Max include depth (10) exceeded')
  return html.replace(INCLUDE_RE, (match, filePath) => {
    const fullPath = resolve(baseDir, filePath)
    let content = readFileSync(fullPath, 'utf-8')
    content = resolveIncludes(content, dirname(fullPath), depth + 1)
    return content
  })
}

const htmlPartialsPlugin = {
  name: 'vite-plugin-html-partials',
  enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('.html') && !id.includes('node_modules')) {
      const result = resolveIncludes(code, process.cwd())
      if (result !== code) {
        return { code: result, map: null }
      }
    }
  },
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return resolveIncludes(html, process.cwd())
    }
  },
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const pathname = req.url.includes('?') ? req.url.slice(0, req.url.indexOf('?')) : req.url
      const url = pathname === '/' ? '/index.html' : pathname
      const cleanUrl = url.endsWith('/') ? url + 'index.html' : url

      const candidates = cleanUrl.endsWith('.html')
        ? [cleanUrl]
        : [cleanUrl + '.html', cleanUrl + '/index.html']

      for (const candidate of candidates) {
        const pagePath = resolve(pagesDir, candidate.slice(1))
        if (existsSync(pagePath)) {
          req.url = '/src/pages' + candidate
          break
        }
      }
      next()
    })
  },
  handleHotUpdate({ file, server }) {
    if (extname(file) === '.html') {
      server.ws.send({ type: 'full-reload' })
      return []
    }
  }
}

const pages = {
  index: 'index.html',
  'contact-sales': 'contact-sales.html',
  login: 'login.html',
  // Product
  product: 'product/index.html',
  enterprise: 'product/enterprise.html',
  pricing: 'product/pricing.html',
  cloud: 'product/cloud.html',
  cli: 'product/cli.html',
  bugbot: 'product/bugbot.html',
  tab: 'product/tab.html',
  teams: 'product/teams.html',
  // Resources
  changelog: 'resources/changelog.html',
  blog: 'resources/blog.html',
  research: 'resources/research.html',
  workshops: 'resources/workshops.html',
  usecases: 'resources/usecases.html',
  download: 'resources/download.html',
  future: 'resources/future.html',
  marketplace: 'resources/marketplace.html',
  docs: 'resources/docs/index.html',
  'docs-getting-started': 'resources/docs/getting-started.html',
  'docs-context': 'resources/docs/context.html',
  'docs-agents': 'resources/docs/agents.html',
  'docs-api': 'resources/docs/api.html',
  help: 'resources/help.html',
  learn: 'resources/learn.html',
  forum: 'resources/forum.html',
  status: 'resources/status.html',
  community: 'resources/community/index.html',
  'community-events': 'resources/community/events.html',
  'community-ambassador': 'resources/community/ambassador.html',
  'community-campus-lead': 'resources/community/campus-lead.html',
  // Company
  careers: 'company/careers/index.html',
  'careers-openings': 'company/careers/openings.html',
  students: 'company/students.html',
  brand: 'company/brand.html',
  // Legal
  'terms-of-service': 'legal/terms-of-service.html',
  privacy: 'legal/privacy.html',
  'data-use': 'legal/data-use.html',
  security: 'legal/security.html',
  'cookie-policy': 'legal/cookie-policy.html',
  'refund-policy': 'legal/refund-policy.html',
  'acceptable-use': 'legal/acceptable-use.html',
  dpa: 'legal/dpa.html',
  sla: 'legal/sla.html',
  disclaimer: 'legal/disclaimer.html',
  imprint: 'legal/imprint.html',
  dmca: 'legal/dmca.html',
}

export default defineConfig({
  plugins: [
    htmlPartialsPlugin,
    tailwindcss()
  ],
  appType: 'mpa',
  publicDir: 'src/assets',
  base: process.env.BASE_URL || '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(pages).map(([key, path]) => [key.replace(/-/g, ''), resolve(pagesDir, path)])
      )
    }
  },
  server: {
    open: true,
  },
})
