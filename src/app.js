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

Alpine.data('pricingToggle', () => ({
  yearly: false,
  toggle() { this.yearly = !this.yearly },
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
  submit() {
    this.submitted = true
  }
}))

Alpine.data('versionSelect', () => ({
  open: null,
  toggle(id) { this.open = this.open === id ? null : id },
}))

Alpine.data('modelSelect', () => ({
  open: false,
  selected: 'Auto',
  models: ['Auto', 'Composer 2.5', 'GPT-5.5', 'Opus 4.8', 'Gemini 3.1 Pro', 'Grok 4.3'],
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
Alpine.start()

document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations()
  initSkipNav()
  createIcons({ icons })
})
