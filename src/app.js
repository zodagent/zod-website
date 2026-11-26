import Alpine from 'alpinejs'
import collapse from '@alpinejs/collapse'
import { createIcons, icons } from 'lucide'

Alpine.plugin(collapse)

// OS Detection
function detectOS() {
  const ua = window.navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('win')) return 'windows'
  if (ua.includes('linux')) return 'linux'
  return 'mac'
}

window.detectOS = detectOS

const os = detectOS()
document.documentElement.setAttribute('data-os', os)

Alpine.data('nav', () => ({
  mobileOpen: false,
  openProduct: false,
  openResources: false,
  toggleMobile() { this.mobileOpen = !this.mobileOpen },
  closeMobile() { this.mobileOpen = false },
}))

// The connectors marketplace (resources/marketplace.html): the list lives in the public repo zodagent/marketplace and is read here
// when the page opens; the page says so when it cannot be reached.
Alpine.data('marketplace', () => ({
  base: 'https://raw.githubusercontent.com/zodagent/marketplace/main',
  repo: 'https://github.com/zodagent/marketplace',
  tab: 'connectors',
  routines: { categories: [], schedules: [], flows: [] },
  rcat: 'All',
  ropen: '',
  items: [],
  perms: {},
  trust: '',
  updated: '',
  loading: true,
  failed: false,
  q: '',
  cat: 'All',
  open: '',
  async init() {
    try {
      const [r, rr] = await Promise.all([
        fetch(`${this.base}/connectors.json`, { cache: 'no-cache' }),
        fetch(`${this.base}/routines.json`, { cache: 'no-cache' }).catch(() => null),
      ])
      if (!r.ok) throw new Error(String(r.status))
      const j = await r.json()
      if (rr && rr.ok) {
        const x = await rr.json()
        this.routines = { categories: x.categories || [], schedules: x.schedules || [], flows: x.flows || [] }
      }
      this.items = Array.isArray(j.connectors) ? j.connectors : []
      this.perms = j.permissions || {}
      this.trust = j.trust || ''
      this.updated = j.updated || ''
    } catch {
      this.failed = true
    }
    this.loading = false
    this.$nextTick(() => createIcons({ icons }))
  },
  logo(c) {
    return c.logo ? `${this.base}/${c.logo}` : ''
  },
  get rcats() {
    return ['All', 'Timed', ...this.routines.categories.map((c) => c.name)]
  },
  // every ready-made routine in one list: the timed ones first, then the step lists by category
  get rshown() {
    const q = this.q.trim().toLowerCase()
    const name = (id) => (this.routines.categories.find((c) => c.id === id) || {}).name || 'Other'
    const rows = [
      ...this.routines.schedules.map((t) => ({ key: `s:${t.id}`, icon: t.icon || 'calendar-clock', title: t.title, desc: t.desc, cat: 'Timed', how: t.prompt, kind: 'Runs on a schedule' })),
      ...this.routines.flows.map((f) => ({ key: `f:${f.id}`, icon: 'list-ordered', title: f.name, desc: f.description, cat: name(f.category), how: f.lines.join('\n'), kind: 'Steps' })),
    ]
    return rows.filter((r) => (this.rcat === 'All' || r.cat === this.rcat) && (!q || `${r.title} ${r.desc} ${r.cat}`.toLowerCase().includes(q)))
  },
  show(tab) {
    this.tab = tab
    this.q = ''
    this.$nextTick(() => createIcons({ icons }))
  },
  get cats() {
    const n = {}
    for (const c of this.items) n[c.cat || 'Other'] = (n[c.cat || 'Other'] || 0) + 1
    return ['All', ...Object.keys(n).sort((a, b) => (a === 'Apps' ? -1 : b === 'Apps' ? 1 : a.localeCompare(b)))]
  },
  get shown() {
    const q = this.q.trim().toLowerCase()
    return this.items.filter(
      (c) =>
        (this.cat === 'All' || (c.cat || 'Other') === this.cat) &&
        (!q || `${c.name} ${c.desc} ${c.cat} ${c.id}`.toLowerCase().includes(q)),
    )
  },
  run(c) {
    return c.transport === 'http' || c.transport === 'sse' ? c.url : `${c.command} ${c.args || ''}`.trim()
  },
  toggle(id) {
    this.open = this.open === id ? '' : id
  },
}))

// The desktop downloads (resources/download.html): the newest release on the public builds repo, one card per system. A system whose
// app is not attached to the release yet says "Coming soon"; each one appears here the moment someone publishes it with `bun run release`.
Alpine.data('download', () => ({
  api: 'https://api.github.com/repos/zodagent/zod-releases/releases/latest',
  releases: 'https://github.com/zodagent/zod-releases/releases',
  version: '',
  date: '',
  loading: true,
  failed: false,
  mine: '',
  get primary() {
    return this.items.find((i) => i.id === this.mine && i.url) || null
  },
  items: [
    { id: 'mac', name: 'macOS', icon: 'apple', note: 'Open the .dmg and drag Zod to Applications. The first time, right-click it and choose Open.', pick: [/\.dmg$/i] },
    { id: 'win', name: 'Windows', icon: 'monitor', note: 'Run the installer. Choose this computer or a USB drive.', pick: [/\.exe$/i, /windows.*\.zip$/i, /win.*setup.*\.zip$/i] },
    { id: 'linux', name: 'Linux', icon: 'terminal', note: 'Unpack it and run the installer inside (x64).', pick: [/linux.*installer\.tar\.gz$/i, /linux-x64-.*setup\.tar\.gz$/i] },
  ],
  async init() {
    const ua = `${navigator.userAgent} ${navigator.platform}`
    this.mine = /Mac/i.test(ua) && !/iPhone|iPad/i.test(ua) ? 'mac' : /Win/i.test(ua) ? 'win' : /Linux|X11/i.test(ua) && !/Android/i.test(ua) ? 'linux' : ''
    try {
      const r = await fetch(this.api, { headers: { accept: 'application/vnd.github+json' } })
      if (!r.ok) throw new Error(String(r.status))
      const j = await r.json()
      this.version = String(j.tag_name || '').replace(/^v/, '')
      this.date = j.published_at ? new Date(j.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''
      const assets = j.assets || []
      const mb = (n) => `${Math.max(1, Math.round(n / 1048576))} MB`
      for (const it of this.items) {
        let hit = null
        for (const re of it.pick) {
          hit = assets.find((a) => re.test(a.name))
          if (hit) break
        }
        it.url = hit ? hit.browser_download_url : ''
        it.file = hit ? hit.name : ''
        it.size = hit ? mb(hit.size) : ''
      }
    } catch {
      this.failed = true
    }
    this.loading = false
    this.items.sort((a, b) => (b.id === this.mine) - (a.id === this.mine))
    this.$nextTick(() => createIcons({ icons }))
  },
}))

// The changelog (resources/changelog.html): the notes of each release on the public builds repo, newest first. The notes are the version's
// section of the app's CHANGELOG.md, attached by `bun run release`, so this page is up to date the moment a version is published.
Alpine.data('changelog', () => ({
  api: 'https://api.github.com/repos/zodagent/zod-releases/releases?per_page=12',
  releases: 'https://github.com/zodagent/zod-releases/releases',
  list: [],
  loading: true,
  failed: false,
  esc: (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  inline(t) {
    return this.esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
  },
  async init() {
    try {
      const r = await fetch(this.api, { headers: { accept: 'application/vnd.github+json' } })
      if (!r.ok) throw new Error(String(r.status))
      const rows = await r.json()
      this.list = rows
        .filter((x) => !x.draft && !x.prerelease)
        .map((x) => {
          const lines = String(x.body || '').split('\n').map((l) => l.trim()).filter(Boolean)
          const bullets = lines.filter((l) => /^[-*] /.test(l)).map((l) => this.inline(l.slice(2)))
          const intro = lines.filter((l) => !/^[-*#]/.test(l)).map((l) => this.inline(l)).join(' ')
          return {
            tag: x.tag_name,
            version: String(x.tag_name).replace(/^v/, ''),
            url: x.html_url,
            date: x.published_at ? new Date(x.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '',
            intro,
            bullets: bullets.slice(0, 10),
            more: Math.max(0, bullets.length - 10),
          }
        })
        .filter((x) => x.bullets.length || x.intro)
    } catch {
      this.failed = true
    }
    this.loading = false
  },
}))

Alpine.data('faq', () => ({
  open: null,
  toggle(id) { this.open = this.open === id ? null : id },
}))

Alpine.data('contactForm', () => ({
  name: '',
  email: '',
  company: '',
  teamSize: '',
  phone: '',
  message: '',
  submitted: false,
  // a static site has no server: the message opens in the visitor's email app, ready to send
  submit() {
    const body = 'Name: ' + this.name + '\nEmail: ' + this.email + (this.company ? '\nCompany: ' + this.company : '') + (this.teamSize ? '\nTeam size: ' + this.teamSize : '') + '\n\n' + this.message
    window.location.href = 'mailto:contact@zodagent.com?subject=' + encodeURIComponent('Message from the Zod website') + '&body=' + encodeURIComponent(body)
    this.submitted = true
  }
}))

Alpine.data('demoForm', () => ({
  name: '', email: '', company: '', teamSize: '', date: '', time: '10:00', zone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''), message: '', topics: ['The whole product'], submitted: false,
  get today() { return new Date().toISOString().slice(0, 10) },
  submit() {
    const body = 'Please book me a Zod demo.\n\nName: ' + this.name + '\nEmail: ' + this.email + (this.company ? '\nCompany or school: ' + this.company : '') + (this.teamSize ? '\nTeam size: ' + this.teamSize : '') + '\nPreferred time: ' + this.date + ' ' + this.time + ' (' + this.zone + ')\nI would like to see: ' + this.topics.join(', ') + (this.message ? '\n\n' + this.message : '')
    window.location.href = 'mailto:contact@zodagent.com?subject=' + encodeURIComponent('Zod demo request: ' + this.name) + '&body=' + encodeURIComponent(body)
    this.submitted = true
  }
}))

Alpine.data('versionSelect', () => ({
  open: null,
  toggle(id) { this.open = this.open === id ? null : id },
}))

Alpine.data('modelSelect', () => ({
  open: false,
  selected: 'OpenRouter',
  models: ['OpenRouter', 'OpenAI', 'Groq', 'Together', 'Ollama', 'LM Studio'],
  select(val) { this.selected = val; this.open = false },
  toggle() { this.open = !this.open },
}))

Alpine.data('themeToggle', () => ({
  theme: localStorage.getItem('marketing-theme') || 'system',
  init() {
    this.applyTheme()
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.theme === 'system') {
        this.applyTheme()
      }
    })
  },
  setTheme(val) {
    this.theme = val
    if (val === 'system') {
      localStorage.removeItem('marketing-theme')
    } else {
      localStorage.setItem('marketing-theme', val)
    }
    this.applyTheme()
  },
  applyTheme() {
    const effective = this.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : this.theme
    document.documentElement.setAttribute('data-theme', effective)
  },
}))

// Scroll-triggered fade-in animations
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

  document.querySelectorAll('.fade-in-section').forEach(el => observer.observe(el))
}

// Skip to content
function initSkipNav() {
  const skipLink = document.querySelector('.skipnav')
  const main = document.querySelector('#main') || document.querySelector('main')
  if (skipLink && main) {
    skipLink.addEventListener('click', (e) => {
      e.preventDefault()
      main.setAttribute('tabindex', '-1')
      main.focus()
    })
  }
}

window.Alpine = Alpine
// the home page's slideshow of every feature: a screenshot of the real app on a wallpaper
Alpine.data('tour', () => ({
  slides: [{"title":"Home","shot":"hub-home","text":"Click the box and it opens: pick the model and the vault, jump to search, routines, connectors or settings, or reopen a recent chat.","href":"/resources/docs/chat"},{"title":"Home, icons-only sidebar","shot":"slide-home-mini","text":"Collapse the sidebar to icons, or hide it, and the workspace gets out of the way.","href":"/resources/docs/chat"},{"title":"A chat that does the work","shot":"chat-agent-run","text":"Each tool step is shown in one quiet card, opened to see what it did and whether it worked.","href":"/resources/docs/chat"},{"title":"It asks first","shot":"chat-confirmation","text":"Anything that changes something stops at an Allow and Deny card, and says what it will do.","href":"/resources/docs/tools"},{"title":"Chat with the slim sidebar","shot":"slide-chat-mini","text":"Long answers, tables and files get the full width, with the chat list a click away.","href":"/resources/docs/chat"},{"title":"Search","shot":"search-palette","text":"One bar over chats, routines, pages, settings, and docs, with filters and verbs.","href":"/resources/docs/search"},{"title":"Routines and the calendar","shot":"scheduler","text":"A month of what ran and what will, and a Coming up list.","href":"/resources/docs/routines"},{"title":"Write a routine","shot":"cron-detail","text":"Who does it, what it does, when it runs, and a dry run to test it.","href":"/resources/docs/routines"},{"title":"Agents","shot":"settings-agents","text":"Nine starter agents and your own, each with its own instructions and tools.","href":"/resources/docs/agents"},{"title":"Connectors","shot":"settings-mcp","text":"MCP servers and apps, with a permission for every tool.","href":"/resources/docs/connectors"},{"title":"Messaging","shot":"settings-webhooks","text":"Talk to Zod from Telegram, Slack, Email and more.","href":"/resources/docs/connectors"},{"title":"Chrome extension","shot":"pairing","text":"A chat panel beside any page, control of Chrome, and a Zod tab on every site.","href":"/resources/docs/extension"},{"title":"Chrome context","shot":"extension-context","text":"A button at the top of the side panel switches to its context: the model, what Zod may use, how full the window is and the connectors.","href":"/resources/docs/extension"},{"title":"Vaults","shot":"group-compose","text":"Pick the vault from the Home box: each is a separate workspace with its own data and look.","href":"/resources/docs/vaults"},{"title":"Model","shot":"settings-providers","text":"Any OpenAI-compatible model, including a local one.","href":"/resources/docs/model"},{"title":"Settings","shot":"settings-general","text":"One clean settings page, themes and wallpapers.","href":"/resources/docs/vaults"},{"title":"Notifications","shot":"broadcast-compose","text":"Told once, clearly, with a button to what it is about.","href":"/resources/docs/vaults"}],
  index: 0, tick: 0, ms: 6500, pause: false, timer: null,
  walls: ['/images/misc/wallpaper-1.jpg', '/images/misc/wallpaper-2.jpg', '/images/misc/wallpaper-3.jpg', '/images/misc/wallpaper-4.jpg', '/images/misc/wallpaper-5.jpg'],
  get wall() { return this.walls[this.index % this.walls.length] },
  init() { this.schedule(); this.$watch('pause', (p) => { if (p) clearTimeout(this.timer); else { this.tick++; this.schedule() } }) },
  destroy() { clearTimeout(this.timer) },
  // the progress line and the timer start together on every slide
  schedule() { clearTimeout(this.timer); this.timer = setTimeout(() => { if (document.hidden) { this.schedule() } else { this.next() } }, this.ms) },
  go(i) { this.index = i; this.tick++; this.schedule() },
  next() { this.go((this.index + 1) % this.slides.length) },
  prev() { this.go((this.index - 1 + this.slides.length) % this.slides.length) },
}))

Alpine.start()

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations()
  initSkipNav()
  createIcons({ icons })
})
