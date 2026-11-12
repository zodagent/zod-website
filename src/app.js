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
  slides: [{"title": "Home", "shot": "hub-home", "text": "Click the box and it opens: pick the model and the vault, jump to search, routines, connectors or settings, or reopen a recent chat.", "href": "/resources/docs/chat"}, {"title": "Home, icons-only sidebar", "shot": "slide-home-mini", "text": "Collapse the sidebar to icons, or hide it, and the workspace gets out of the way.", "href": "/resources/docs/chat"}, {"title": "A chat that does the work", "shot": "chat-agent-run", "text": "Each tool step is shown in one quiet card, opened to see what it did and whether it worked.", "href": "/resources/docs/chat"}, {"title": "It asks first", "shot": "chat-confirmation", "text": "Anything that changes something stops at an Allow and Deny card, and says what it will do.", "href": "/resources/docs/tools"}, {"title": "Chat with the slim sidebar", "shot": "slide-chat-mini", "text": "Long answers, tables and files get the full width, with the chat list a click away.", "href": "/resources/docs/chat"}, {"title": "Search", "shot": "search-palette", "text": "One bar over chats, routines, pages, settings, memory and docs, with filters and verbs.", "href": "/resources/docs/search"}, {"title": "Routines and the calendar", "shot": "scheduler", "text": "A month of what ran and what will, and a Coming up list.", "href": "/resources/docs/routines"}, {"title": "Write a routine", "shot": "cron-detail", "text": "Who does it, what it does, when it runs, and a dry run to test it.", "href": "/resources/docs/routines"}, {"title": "Memory", "shot": "settings-memory", "text": "Notes Zod keeps, finds by their words, and lets you edit and forget.", "href": "/resources/docs/memory"}, {"title": "Agents", "shot": "settings-agents", "text": "Ten starter agents and your own, each with its own instructions, skills and tools.", "href": "/resources/docs/agents"}, {"title": "Skills", "shot": "settings-tools", "text": "Saved know-how the agent loads when a request matches.", "href": "/resources/docs/agents"}, {"title": "Connectors", "shot": "settings-mcp", "text": "MCP servers and apps, with a permission for every tool.", "href": "/resources/docs/connectors"}, {"title": "Messaging", "shot": "settings-webhooks", "text": "Talk to Zod from Telegram, Slack, Email and more.", "href": "/resources/docs/connectors"}, {"title": "Chrome extension", "shot": "pairing", "text": "A chat panel beside any page, control of Chrome, and a Zod tab on every site.", "href": "/resources/docs/extension"}, {"title": "Chrome context", "shot": "extension-context", "text": "A button at the top of the side panel switches to its context: the model, what Zod may use, how full the window is and the connectors.", "href": "/resources/docs/extension"}, {"title": "Vaults", "shot": "group-compose", "text": "Pick the vault from the Home box: each is a separate workspace with its own data and look.", "href": "/resources/docs/vaults"}, {"title": "Model", "shot": "settings-providers", "text": "Any OpenAI-compatible model, including a local one.", "href": "/resources/docs/model"}, {"title": "Settings", "shot": "settings-general", "text": "One clean settings page, themes and wallpapers.", "href": "/resources/docs/vaults"}, {"title": "Notifications", "shot": "broadcast-compose", "text": "Told once, clearly, with a button to what it is about.", "href": "/resources/docs/vaults"}],
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
