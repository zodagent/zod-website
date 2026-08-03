# Zod Agent

> **Make It Yours.** A client-side, agentic AI chat workspace that runs entirely in your browser.

Zod is a self-hosted, zero-backend AI assistant frontend. It gives you a ChatGPT-like conversation UI on top of **any OpenAI-compatible API** (OpenAI, OpenRouter, Together, Groq, local servers like Ollama/LM Studio — anything that speaks `/v1/chat/completions`). Everything — sessions, memory, tools, provider keys, preferences — is stored locally in `localStorage` (mirrored to IndexedDB for the background scheduler), so there is no account, no server, and no data leaving your machine except the requests you explicitly send to the LLM providers you configure.

**Note on status:** This is a **working agentic app**. The chat workspace, provider layer, tool loop, structured rendering, YAML config system, task scheduler, a **service-worker background scheduler** (scheduled agents and workflow runs keep executing even when the tab is closed), the **workflow execution harness** (which turns orchestration YAML into live multi-step runs), **custom tool runtimes**, and an **MCP-over-HTTP client** are complete and functional. What is *not* built yet is **true multi-agent collaboration** (shared sessions with per-step sub-loops). See [Project status](#project-status) for the exact done/missing breakdown, [`arch.md`](arch.md) for the target runtime's data model, and [Porting](#porting-desktop--chrome-extension) + [What you can build](#what-you-can-build-with-this) below.

---

## Table of Contents

- [Why Zod?](#why-zod)
- [What it can do](#what-it-can-do)
- [Background agents](#background-agents-service-worker)
- [Project status](#project-status)
- [Tech stack](#tech-stack)
- [How it's made](#how-its-made)
  - [Build pipeline](#build-pipeline)
  - [State management](#state-management)
  - [Provider engine & the LLM loop](#provider-engine--the-llm-loop)
  - [Structured output parser](#structured-output-parser)
  - [Persistence](#persistence)
  - [Client-side only — it's all browser APIs](#client-side-only--its-all-browser-apis)
- [Modules](#modules)
  - [Views (HTML)](#views-html)
  - [Stores](#stores)
  - [Utils](#utils)
  - [Components](#components)
  - [The core engine](#the-core-engine)
- [The tool system](#the-tool-system)
- [YAML everywhere](#yaml-everywhere)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
  - [Tests](#tests)
- [Configuration](#configuration)
- [Porting: Desktop & Chrome extension](#porting-desktop--chrome-extension)
- [What you can build with this](#what-you-can-build-with-this)
- [Roadmap](#roadmap)

---

## Why Zod?

- **Zero backend.** No sign-up, no install of a daemon, no cloud dependency. Open the page, add an API key, chat.
- **Provider-agnostic.** Use any OpenAI-compatible endpoint. Configure many providers, pick a default and a fallback.
- **Local-first.** Your entire history, memory, to-dos, notes, data stores, and preferences live in your browser's `localStorage`. Close the tab and come back later — it's all still there.
- **Tool-using agents in the browser.** Zod runs a real **multi-round function-calling loop** client-side: the model can call built-in tools (calculator, clipboard, timers, memory, todos, notes, data store, crypto/random, time/timezones, JSON/YAML utilities, and interactive confirmations), **user-defined custom tools** (JavaScript you write in Settings), and **MCP server tools over HTTP**, and get their results back to continue the conversation.
- **Structured output.** The assistant is instructed to emit lightweight `[section]` markers, which Zod parses into rich, rendered cards — thinking, badges, findings, suggestions, to-dos, code blocks, files, errors, security warnings, visualizations, HTML, and confirmation plans.
- **Configure everything as YAML.** Providers, memory, custom tools, and MCP servers are all editable as live, syntax-highlighted YAML in the settings drawer — with an "ask AI to edit this YAML" button on every section.
- **A real meta-harness editor.** The orchestrator drawer is a code-aware line editor for building agent workflows (`@step`, `@tool`, `@skill`, `@goto`) with autocomplete and an AI prompt box.
- **Task scheduling.** Schedule a prompt to run once, on an interval, daily, or weekly. The built-in scheduler runs your prompt through the full agent loop (tools included) and delivers the result into a session — and, via a service worker, keeps running even after you close the tab.
- **Beautiful & mobile-friendly.** DaisyUI themes, wallpapers, glass blur/opacity controls, resizable drawers, and a touch-friendly layout.

---

## What it can do

### Chat & sessions
- **Home hub** with greeting, current time, a large prompt box, and quick actions (Search sessions, Settings, Open Orchestrator, New conversation).
- **Conversational chat** with streaming tokens, auto-resizing input, send via Enter, context-length meter (approximate token usage + % of a 4096 window), and message count.
- **Sessions drawer** — create, search, switch, and delete sessions (search matches titles *and* message content). Search also covers **harnesses**.
- **Message actions** on every assistant reply: copy, regenerate, delete, upvote/downvote rating, and timestamp. User messages can be edited, copied, or deleted.
- **Rich rendering** of assistant output (see [Structured output parser](#structured-output-parser)).

### Chat input superpowers
- **Slash commands** — type `/` to insert a prompt template: think step by step, write code, explain, fix bugs, review, docs, tests, refactor, plan, summarize, translate, optimize, diagram, table, expand.
- **Mentions** — type `@` to mention **agents**, **sessions**, and **tools** with a searchable, grouped picker.
- **File attachments** — the paperclip in the chat bar attaches text files (`.txt`, `.md`, `.json`, `.yaml`, `.js`, …); their contents are embedded in the LLM context and shown as chips on your message.
- Both popovers support keyboard navigation (arrows, Enter/Tab, Esc).
- **Schedule button** — a `calendar-clock` button in the chat bar opens the Scheduler with your current message pre-filled as the prompt.

### Scheduling (cron-style tasks)
Zod includes a lightweight in-browser task scheduler:

- **Create a task** with a prompt and one of four modes:
  - **Once** — run at a specific date & time.
  - **Repeat** — run every N seconds / minutes / hours (immediately after the first interval).
  - **Daily** — run every day at a chosen time.
  - **Weekly** — run on a chosen weekday at a chosen time.
- **Delivery** — results land in a **new session** (created automatically) or into an existing session you pick, so scheduled runs never disturb the conversation you're in.
- **Manage tasks** — from the Scheduler drawer you can **run now**, **enable/disable**, and **delete** tasks, and see each task's schedule summary, status, next run, last run, and the latest result preview.
- **Notifications** — optional browser notifications when a scheduled run finishes or fails.
- **Workflow triggers** — each task can optionally pick a harness from the Scheduler drawer; when the cron fires, it executes the harness's workflow steps (via the runner) instead of a bare prompt, and the resulting `workflowRun` card lands in the target session.
- When a task fires, the prompt goes through the **full agent loop**: history is built, all built-in tool schemas are offered, and tool calls are executed in the browser before the answer is appended to the session.
- One-time tasks auto-disable after firing; repeating tasks re-compute their next run.
- The scheduler ticks every second while the tab is open, so tasks run while Zod is open in the browser.

### Background agents (service worker)

Scheduled work doesn't have to stop when you close the tab. A classic service worker (`public/sw.js`) runs the scheduler in the background, side-by-side with the offline cache:

- **Mirrors state.** `src/js/utils/bgSync.js` snapshots the app's `localStorage` document into an IndexedDB store (`zod-bg`) on every save, so the worker always sees the latest settings (provider config), sessions, memory, and crons.
- **Runs due crons in the background.** The worker ticks every 2 seconds (and is woken on demand by a `sync` message from the page). For each due cron it builds history from the snapshot and runs the **full agent loop** (tools included) against your configured provider — or executes the cron's **workflow** harness if one is attached.
- **Concurrent agents.** Up to 3 cron runs execute in parallel, so multiple "agents" (one per scheduled task) work simultaneously.
- **Writes results back.** The worker pushes session, message, and cron-status updates to an IndexedDB `outbox`. When the app is (re)opened or focused, the page imports those rows into the stores — new sessions, assistant messages, and `status`/`lastResult` on crons — with no reload needed.
- **Survives reload & tab close.** A run that completes while you're away shows up as a done task with its reply the next time you open Zod. Closing and reopening the tab re-activates the worker, which re-snapshots state and catches up on any missed due runs.

Caveat: a service worker only lives while the browser itself is open (a closed tab suspends it until the browser wakes it or the next visit). For an always-on guarantee, port the scheduler to `chrome.alarms` (extension) — see [Porting](#porting-desktop--chrome-extension).

### Tool-using agent loop
When you send a message, Zod:
1. Builds a message history from the current session.
2. Calls the configured provider with the full set of built-in tool schemas.
3. If the model requests tool calls, Zod **executes them in the browser** and feeds the results back — repeating up to 6 rounds.
4. Streams the final answer into the chat.

Built-in tools include: `memory`, `todo`, `notes`, `calculator`, `clipboard`, `timer`, `code_tools` (JSON/YAML), `data_store`, `confirm` (interactive yes/no modal), `random` (UUIDs, dice, hashing), and `time` (timezones, conversions). Details in [The tool system](#the-tool-system).

### Structured, rendered responses
The model is instructed (via the default system prompt) to optionally use section markers. Zod parses and renders each one as a distinct UI card:

| Marker | Rendered as |
|---|---|
| `[thinking]` | Collapsible "Thinking" step list |
| `[badges]` | Colored status chips (`#info`, `!error`, `$secondary`, `@primary`) |
| `[findings]` | Findings list with success / info / error status dots |
| `[suggestions]` | Clickable suggested next-step buttons that send the prompt |
| `[todos]` | Checklist with checkboxes and strikethrough |
| `[code:lang]` | Syntax-labeled code block |
| `[file]` / `[files]` | File chip(s) |
| `[error:type]` | Styled error card |
| `[security-warning]` | Red warning banner |
| `[tool:name]` | Agent tool result block |
| `[confirmation]` | **Approve / Reject** plan card with tool checklist |
| `[task-completed]` | Green "Task completed" pill |
| `[team-feedback]` | Multi-agent feedback avatars |
| `[viz]` | Inline bar-chart visualization |
| `[html]` | Rendered HTML (DaisyUI/Tailwind classes) |
| `[divider]` | Horizontal rule |

### Orchestrator (meta-harness editor)
- A line-based code editor drawer for composing **agent workflows** as structured text:
  - `# Title`
  - `## @step:name` — a step definition
  - `@tool:name` — a tool to grant the step
  - `@skill:name` — a skill to apply
  - `→ @goto:name` — a transition to another step
- Live syntax-aware rendering, per-line editing, Enter to split, Backspace to merge, Tab indent.
- **Autocomplete** for `@step:`, `@tool:`, `@skill:`, `@goto:` tokens.
- Bi-directional conversion between the friendly line format and strict YAML (`title:` + `steps:`).
- "Ask AI to modify this harness" prompt box.
- The current orchestration is saved onto the **active agent** and the **active harness**.
- **Workflows actually run** (`src/js/engine/runner.js`): a **Run** button in the editor, a **"Run Active Workflow"** hub quick action, and a play button on each harness row execute the steps against your provider — per-step tool grants, `@goto` transitions (with `success`/`error`/`contains:`/`match:` conditions), skill hints, and a live step-by-step progress card in the chat. See the [Project status](#project-status) table.

### Session data side panel
A database panel that collapses in next to the chat with three tabs, all persisted across sessions:
- **Tasks** — persistent to-do list (check, edit, delete, clear).
- **Notes** — key/value scratch notes.
- **Data** — namespaced key/value store (like a tiny DB).

### Settings drawer — 6 tabs
- **General** — default/fallback provider, general model, active harness, editable system prompt, request timeout, retry count, rate limit (RPM), request logging toggle.
- **Preferences** — wallpapers, background opacity & blur, panel opacity & blur, grid toggle/opacity, answer font, and **36 DaisyUI themes**.
- **Providers** — live YAML editor for provider list, model autocomplete (fetches real models from each provider's `/models`), secrets masked unless toggled, boolean toggles, add-provider form, and an "ask AI" editor.
- **Memory** — persistent long-term memory as YAML blocks (`## heading` + content), editable, with AI assistance.
- **Tools** — define **custom tools** (name + description + JavaScript `implementation`) as YAML that get exposed to the model alongside built-ins and MCP tools, and execute in the browser.
- **MCP** — declare **MCP servers** (name + HTTP URL + optional headers) in YAML. A built-in MCP-over-HTTP client connects to each server and surfaces its tools in the agent loop.

### Extras
- Theme-aware favicon + `<meta theme-color>` that sync with the active theme.
- Animated **Braille loading indicators**.
- Lucide icons, auto-refreshed by a MutationObserver.
- Resizable drawers with persisted widths (`resize-x` handles).
- Splash screen, safe-area handling for mobile, PWA-friendly static build.

---

## Project status

**Verdict:** the UI, provider layer, tool loop, structured rendering, YAML config system, scheduler, the **workflow execution harness**, **custom tool runtimes**, and the **MCP-over-HTTP client** are **done and functional**. What remains is multi-agent collaboration.

### ✅ Done (verified in code)

| Area | What works |
|---|---|
| Chat & sessions | Hub, sessions CRUD + search + rename, streaming chat, context meter, message edit/delete/regenerate/rate |
| Chat input | `/` slash commands, `@` mentions (agents/sessions/tools), keyboard navigation |
| Provider engine | Streaming (SSE), retries w/ backoff, rate limiting, timeout, fallback provider, tool-call parsing (streamed & non-streamed) |
| Tool loop | Full client-side function-calling loop (≤6 rounds) in `utils/agent.js`, shared by chat and scheduler |
| Built-in tools | 11 working: `memory`, `todo`, `notes`, `calculator`, `clipboard`, `timer`, `code_tools`, `data_store`, `confirm`, `random`, `time` |
| Structured output | `parseLlmOutput` + 16 rich card renderers (incl. Approve/Reject confirmation plans) |
| Settings | 6 tabs incl. aligned-YAML editors for providers/memory/tools/MCP with "ask AI" editing + model autocomplete |
| Orchestrator | Line-based workflow editor with autocomplete, line-format ⇄ YAML, harness CRUD |
| **Agent harness** | **`src/js/engine/runner.js` executes orchestration YAML**: per-step tool filtering, skill hints, `@goto` control flow with conditions (`success`/`error`/`contains:`/`match:`), journal continuity, loop guard; live `workflowRun` card + per-step assistant messages + tool-run details. Run from editor button, hub quick action, harness row play button. |
| Session data | Persistent Tasks / Notes / Data (namespaced KV) panel |
| Scheduler | Once / repeat / daily / weekly tasks, run-now, enable/disable/delete, delivery to new or chosen session, browser notifications, status tracking, **workflow triggers** (pick a harness and it executes its steps when the cron fires) |
| **Background agents** | **Service-worker scheduler** (`public/sw.js` + `src/js/utils/bgSync.js`): mirrors the app state into IndexedDB, runs due crons (bare prompts or workflow harnesses) through the full tool loop in the background — even with the tab closed — up to 3 concurrent runs, and writes results back through an IndexedDB outbox that the page imports on return (new sessions, messages, cron `status`/`lastResult`) |
| **Custom tools** | **User-defined JS tools** in Settings → Tools: `implementation` code runs in a sandbox (args + state/fetch/timers via `sandbox.ctx`), exposed to the model alongside built-ins in chat, scheduler, and workflows |
| **MCP client** | **`utils/mcp.js`** — JSON-RPC over HTTP (`initialize` / `tools/list` / `tools/call`), session headers, SSE responses; server tools surface in the loop |
| File upload | Attach `.txt/.md/.json/.yaml/.js/…` files from the chat bar; contents are embedded in the LLM context and shown as chips |
| Backup | Settings → General → **Export data (JSON)** downloads the full `zodagent` state; **Import data** restores and reloads |
| PWA | `public/manifest.webmanifest` + `public/sw.js` (offline cache + background scheduler), registered in production |
| Persistence | Single-key `localStorage`, survives reloads |
| Build | Vite + custom `@import` HTML partials, Tailwind v4 + DaisyUI |

### ❌ Missing & how to close each gap

| # | Gap | Current state | How to build it |
|---|---|---|---|
| 1 | **Agent execution harness** | ✅ **DONE** — `src/js/engine/runner.js`: `yamlToSteps()` → per-step loop with only that step's tools (schema filtering), skill hints, `@goto` control flow (incl. `on success`/`error`/`contains:`/`match:` conditions), journal continuity between steps, loop guard, live `workflowRun` card + per-step messages + tool-run details. Triggered from the orchestrator Run button, hub "Run Active Workflow", and a per-harness play button. | — |
| 2 | Cron → agent/workflow triggers | ✅ **DONE** — crons have a `workflowId`; a scheduler harness picker executes a harness's steps instead of a bare prompt. | — |
| 3 | Custom tool runtime | ✅ **DONE** — Settings → Tools accepts an `implementation` (JavaScript) per tool; `runCustomTool` (`utils/tools.js`) executes it in a sandbox (`sandbox.args` + `sandbox.ctx` with state/fetch/timers) and dispatches via `runAnyTool` in chat, scheduler, and the runner. | — |
| 4 | MCP runtime | ✅ **DONE** — `utils/mcp.js` is a minimal MCP client over HTTP (JSON-RPC `initialize` / `tools/list` / `tools/call`, session-id headers, SSE responses). MCP config is now `name` + `url` + `headers`; connected servers' tools are offered to the model and executed on call. | — |
| 5 | Skills execution | 🟡 **Partial** — in the harness, skills are injected as system-prompt hints (a `SKILL_HINTS` map in `runner.js`); still absent from plain chat | Add per-skill tool grants and surface them in the normal chat loop too |
| 6 | Multi-agent collaboration | `getAgentsForSession` + sharing model exist; no runtime | In the runner, `@agent:name` spawns a sub-loop with that agent's provider/prompt; merge `[team-feedback]` results |
| 7 | PWA / offline | ✅ **DONE** — `public/manifest.webmanifest` + `public/sw.js` (offline cache + background scheduler) registered in `main.js` for production builds; offline shell + installability. | — |
| 8 | File upload / attachments | ✅ **DONE** — chat bar paperclip picks text files; contents are embedded into the LLM message and shown as chips on the user message. | — |
| 9 | Backup / export / import | ✅ **DONE** — Settings → General → "Data": Export downloads the whole `zodagent` JSON; Import restores it and reloads. | — |
| 10 | "Available tools" are fake | ✅ **DONE** — the fake `availableTools` display list was removed; the tools store (`stores/ui.js`) now derives from the real `builtinToolSchemas()`, and MCP/custom tools are appended in `stores/tools.js`. | — |
| 11 | Scheduler durability | ✅ **DONE** — a classic service worker now runs the scheduler in the background (`public/sw.js` + `utils/bgSync.js`): it snapshots state into IndexedDB, ticks due crons (prompts + workflow triggers) while the tab is closed, and writes results back through an outbox the page imports on return. Still requires the browser to be open. | Extension: swap in `chrome.alarms` (fires ≥1min even closed) and `chrome.storage.local` for full always-on |
| 12 | No auth / multi-user / sync | Single user, local-only by design | Add a sync adapter (indexedDB → Firebase/Supabase/remote) behind the `storage.js` interface |
| 13 | Tests / linting | ✅ **DONE** — three suites: the **CDP** headless-Chrome e2e suite (`tests/e2e.mjs` + `tests/journeys.mjs`, 14 journeys / 116 checks), a **Playwright** driver of the same journeys + a background-agent journey (`tests/pw-e2e.mjs`, 123 checks, service workers enabled), and a **real-provider** suite against a live OpenRouter free model (`tests/real-e2e.mjs`, 28 checks). Run via `npm test`, `npm run test:pw`, `npm run test:real` | — |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Alpine.js](https://alpinejs.dev) `^3.14` (reactive components + stores, no build-time framework) |
| Build tool | [Vite](https://vitejs.dev) `^6` |
| Styling | [Tailwind CSS](https://tailwindcss.com) `^4` (via `@tailwindcss/vite`) + [DaisyUI](https://daisyui.com) `^5` themes |
| Markdown | [marked](https://marked.js.org) `^18` |
| YAML | [js-yaml](https://github.com/nodeca/js-yaml) `^5` |
| Icons | [lucide](https://lucide.dev) `^1` (Web Components) |
| Typography | `@tailwindcss/typography` |
| Backend | **None** — pure static frontend; LLM calls go straight from the browser to provider APIs |

Everything is plain ES modules — no TypeScript, no bundler plugins beyond Vite + Tailwind, no server runtime.

---

## How it's made

### Build pipeline

**1. HTML includes.** `index.html` is a skeleton full of `<!-- @import "src/html/…" -->` comments. A tiny custom Vite plugin (`vite.config.js`) inlines those files (recursively, up to 10 levels deep) before the page is served or built. This lets each UI region live in its own file while still being a single static page.

**2. Tailwind v4 + DaisyUI.** `style.css` imports Tailwind and sets up the design system: custom CSS variables for panel blur/opacity, grid background, wallpapers, glass panels, resizable handles, the orchestration editor colors, and the chat typography. Theming is done by swapping `data-theme` on `<html>` to one of 36 DaisyUI themes.

**3. Entry point.** `src/js/main.js`:
- Imports all `utils` and registers every Alpine **store** and **component**.
- Sets up a theme-aware favicon generator.
- Boots Alpine, then wires up **resizable drawers** (drag handles, persisted widths, desktop-only, touch support).

### State management

All application state lives in Alpine **stores** (`Alpine.store(...)`), registered in `main.js`:

- **`settings`** — themes, wallpaper, opacity/blur, fonts, grid, providers, system prompt, request tuning, memory/todo/notes/dataStore, tools/MCP YAML, drawer widths, custom tools. Persists everything to `localStorage` under the key `zodagent` on every mutation.
- **`agents`** — the list of agents, the active agent, and which sessions belong to which agent.
- **`sessions`** — the list of chat sessions, the active session, and message CRUD.
- **`harnesses`** — named workflow harnesses, each storing its orchestration YAML.
- **`skills`** — a curated list of skill names used by the orchestrator autocomplete.
- **`ui`** — drawer open/close flags and the current orchestration YAML buffer.
- **`dd`** — a tiny reusable **dropdown/combobox engine** (open state, search query, keyboard highlight, pick) used by all the settings dropdowns.
- **`tools` / `toolSchemas`** — the list of built-in tool names and a factory that returns all built-in tool schemas for the model.

The two big interactive pieces are Alpine **components** (`x-data`):

- **`workspacePage`** (on `#app`) — the whole chat workspace: hub, chat input, mentions/commands, the tool loop, plan approval/rejection, the orchestrator editor, the session-data panel, and timer/notification plumbing.
- **`preferencesPanel`** (in the settings drawer) — the settings UI, including all four YAML editors and the AI-assisted editing.

### Provider engine & the LLM loop

`src/js/zod.js` contains the provider abstraction:

- **`Provider`** — wraps any OpenAI-compatible `/chat/completions` endpoint.
  - **Streaming** — SSE parsing with token-by-token `onToken` callbacks.
  - **Retries** with exponential backoff (`500ms * attempt`), only when the error is retryable (429/5xx/timeouts/network).
  - **Rate limiting** — a sliding 60-second window honoring a configurable RPM.
  - **Timeout** — an `AbortController` that aborts after the configured timeout and converts it to a friendly error.
  - **Fallback** — if the primary provider fails, it transparently retries on the configured fallback provider.
  - **Tool calls** — parses `tool_calls` from both normal and streaming responses (accumulating streamed function arguments across chunks).
- **`buildProviderFromSettings(settings)`** — resolves default/fallback providers from the settings store and constructs a configured `Provider`, wiring up retries, rate limit, timeout, logging, and the system prompt.
- **`buildMessagesForChat(sessionMessages)`** — flattens session messages (user/assistant roles) into the OpenAI message shape, embedding any attached file contents as `### File:` blocks.
- **The tool loop** (`workspacePage._chatLoop`) — up to 6 rounds: send messages + all tool schemas → if the model asks for tool calls, execute them locally → append the tool results → call again.

### Structured output parser

`parseLlmOutput(rawText)` in `zod.js` scans the assistant's raw text for section markers:

```
[thinking]
[badges] #done !blocked $v2.0
[findings] [x] found / [!] issue / [~] pattern
[suggestions] 1. …
[todos] [x] done / [ ] pending
[code:python]
[file] main.js (2.1 KB)
[files]
[error:api]
[security-warning]
[tool:terminal]
[confirmation]
[divider]
[task-completed]
[team-feedback]
[viz]
[html]
```

It separates prose from markers, keeps inline sections (badges/files/divider/task-completed) on their marker line, extracts trailing prose from `thinking/findings/suggestions/todos`, and builds a structured message object. The messages template then renders each field as a distinct card. If no markers are present, the text passes through untouched.

### Persistence

A single `localStorage` key (`zodagent`) stores the whole app state as one JSON document (`utils/storage.js`). Every store exposes a `_save()` that merges its slice into that document via `lsLoad/lsSave` — sessions, agents, harnesses, preferences, memory, and scheduled tasks all survive reloads. No server. For the [background scheduler](#background-agents-service-worker), the same document is **mirrored into IndexedDB** (`zod-bg`) on every save so the service worker can read it, and the worker's results come back through an IndexedDB `outbox` that the page imports on return.

### Client-side only — it's all browser APIs

There is **no server and no Node runtime**. Everything Zod does uses APIs that exist in any modern browser tab:

- `fetch` + `ReadableStream` → provider streaming & retries (`utils/providers.js`)
- `localStorage` → all persistence (`utils/storage.js`)
- `indexedDB` + a classic **service worker** → the background scheduler (`public/sw.js` + `utils/bgSync.js`)
- `setInterval` / `Date` → the in-tab cron ticker (`utils/schedule.js`)
- `Notification` + `navigator.serviceWorker` (optional) → task alerts and background runs
- `crypto.subtle` → future encryption of stored API keys
- `navigator.clipboard`, `AbortController`, `DOM` → tool loop & UI

That is exactly why it ports cleanly to desktop and extensions — see [Porting](#porting-desktop--chrome-extension).

---

## Modules

### Views (HTML)

Each file in `src/html/` is one region of the app, inlined into `index.html` by the Vite plugin.

| File | Purpose |
|---|---|
| `head.html` | `<meta>` tags, title, favicon, stylesheet link |
| `splash.html` | Pre-boot splash screen |
| `hub.html` | The home screen: logo, greeting, time, prompt box, quick actions |
| `messages.html` | The message list + all rich message card renderers + the session-data side panel + confirm modal |
| `chat-input.html` | The bottom chat bar: context meter, toggle/home/data/search/settings/editor buttons, `/`-commands and `@`-mentions pickers, the textarea |
| `editor-drawer.html` | The orchestrator (meta-harness) editor overlay |
| `settings-drawer.html` | The settings drawer with all 6 tabs |
| `sessions-drawer.html` | The sessions + harnesses search drawer |
| `scheduler-drawer.html` | The task scheduler drawer: new-task form + scheduled-task list |
| `logo.svg.html` | The Zod logo mark |

### Stores

| File | Store | Responsibility |
|---|---|---|
| `settings.js` | `settings` | All user prefs + provider config + persistent agent state (memory/todo/notes/dataStore/tools/MCP); applies theme, wallpaper, blur, grid, favicon |
| `agents.js` | `agents` | Agent list, active agent, agent↔session links |
| `sessions.js` | `sessions` | Session list, active session, message CRUD |
| `harnesses.js` | `harnesses` | Named workflows with orchestration YAML |
| `skills.js` | `skills` | Skill catalog for autocomplete |
| `ui.js` | `ui` | Drawer flags + orchestration YAML buffer + tools list (real builtin tool names) + scheduler prefill |
| `dd.js` | `dd` | Reusable dropdown/combobox engine |
| `tools.js` | `toolSchemas` | Returns built-in + custom + MCP tool schemas; refreshes connected MCP tools on init/save; `runTool` dispatches MCP calls |
| `crons.js` | `crons` | Scheduled tasks (add/update/remove/toggle/run-now), persisted locally |

### Utils

| File | Purpose |
|---|---|
| `zod.js` | **Core engine** — Provider class, rate limiter, streaming, retries, fallback, message builders, structured-output parser |
| `tools.js` | **Built-in tool implementations** — memory, todo, notes, calculator, clipboard, timer, code_tools, data_store, confirm, random, time |
| `memory.js` | Memory markdown block parsing + the `memory` tool schema/runner |
| `yaml.js` | Custom **aligned YAML formatter** (all colons aligned to one column, smart inline vs. block layout, value wrapping), plus orchestration ⇄ YAML converters and the default orchestration |
| `socraticEditor.js` | The "Socratic" YAML line renderer: syntax colors keys/values, masks secrets, links URLs, highlights env vars (`$VAR`), toggles booleans — used by all config editors |
| `editor.js` | Orchestration line renderer + line-type classifier + `parseOrchLines` (accepts both line format and YAML) |
| `rendering.js` | `esc`, light-theme detection, `renderChat` (marked → HTML with mention styling + task-list support) |
| `icons.js` | Lucide icon auto-refresh (rAF + requestIdleCallback + MutationObserver) |
| `braille.js` | Animated Braille loading dots |
| `agent.js` | Shared agent loop: executes tool calls round-by-round (`runAgentChat`), used by both chat and the scheduler |
| `mcp.js` | Minimal **MCP client over HTTP** — JSON-RPC `initialize`/`tools/list`/`tools/call`, session-id headers, SSE responses |
| `schedule.js` | Next-run math for crons (`computeNextRun`), human-readable schedule summaries |
| `scheduler.js` | Background ticker that fires due tasks (prompts *or whole harness workflows*) through the full agent loop and writes results into sessions |
| `bgSync.js` | Background bridge — mirrors the `localStorage` document into IndexedDB (`zod-bg`) for the service worker, and imports the worker's `outbox` results back into the stores (new sessions, messages, cron status) |
| `storage.js` | `lsLoad` / `lsSave` for the single `localStorage` document |
| `defaults.js` | Theme list, empty default agents/sessions |

### Components

| File | Purpose |
|---|---|
| `workspacePage.js` | The full chat workspace component: hub/send flow, streaming, tool loop, plan approve/reject, orchestrator editing + autocomplete, session-data CRUD, timers, confirm modal, context meter |
| `preferencesPanel.js` | Settings component: 6 tabs, a factory (`createTabEditor`) that generates the full YAML-editing behavior for each config section (tools, MCP), plus dedicated providers/memory editors with AI-assisted editing |
| `schedulerPanel.js` | Scheduler drawer component: prompt + mode form, delivery-session picker, and the scheduled-task list with run-now / toggle / delete |

### The core engine

- **`src/js/zod.js`** — provider + parsing (see above).
- **`arch.md`** — the conceptual data model for the agent runtime: agents own sessions and crons, a cron triggers an agent, sessions send prompt sequences to an LLM, agents loop until done, sessions may be collaborative (multi-agent). The part of this that covers workflow step execution is now realized by `src/js/engine/runner.js`; the multi-agent portion remains future work.
- **`src/js/engine/runner.js`** — the **workflow execution harness**: `yamlToSteps()` → per-step loop with schema-filtered tool grants, skill hints, `@goto` control flow (incl. `on success`/`error`/`contains:`/`match:` conditions), journal continuity, loop guard, and a live `workflowRun` card. Exposed as `window.createWorkflowMessage` + `window.runWorkflow`, used by the orchestrator Run button, the hub quick action, harness play buttons, and the scheduler.

---

## The tool system

Zod ships a fully functional **client-side function-calling toolbelt**. Each tool declares a JSON Schema (`*Schema()`) and a runner (`run*()`), wired together in `builtinToolSchemas()` and `runBuiltinTool()`.

| Tool | Actions | What it does |
|---|---|---|
| `memory` | read / write / delete / clear | Long-term markdown memory blocks (`## heading`), persists across sessions |
| `todo` | add / check / uncheck / delete / list | Persistent to-do list, persisted as markdown |
| `notes` | set / get / delete / list | Key→value scratch facts |
| `calculator` | evaluate | Safe arithmetic with a hand-written tokenizer/parser: `+ - * / % ^`, parentheses, `sqrt`, `exp`, `log/ln`, trig, `min/max`, `pi`, `e` |
| `clipboard` | read / write | System clipboard access (requires browser permission) |
| `timer` | set / list / cancel | In-browser reminders that surface as a chat message + browser Notification |
| `code_tools` | json_format / json_validate / yaml_to_json / json_to_yaml / yaml_format | JSON & YAML utilities, including the global-aligned YAML formatter |
| `data_store` | set / get / delete / list / clear | Namespaced persistent KV store (a tiny database) |
| `confirm` | ask | Prompts the user with a **yes/no modal** before destructive actions |
| `random` | uuid / dice / number / hash | UUIDs, dice rolls, random numbers, WebCrypto hashes |
| `time` | now / convert / list_timezones | Current time, timezone conversions, common IANA zones |

Tool execution context (`_toolContext()` in `workspacePage.js`) wires persistent state (memory, todos, notes, dataStore) into the tools, persists changes after every mutation, and provides the timer registry and the `askUser` bridge.

**Custom tools** declared in Settings → Tools carry a JavaScript `implementation`. When the model calls one, `runCustomTool` (`utils/tools.js`) runs the code in a sandbox object exposing `sandbox.args` (the tool arguments) and `sandbox.ctx` (persistent state, `fetch`, timers, `askUser`, memory getters/setters) and returns a string or JSON value back into the loop. `runAnyTool()` dispatches custom → MCP → built-in so custom tools work identically in chat, the scheduler, and workflow steps.

**MCP servers** declared in Settings → MCP are connected over HTTP by `utils/mcp.js` — a minimal JSON-RPC 2.0 client that performs `initialize` / `notifications/initialized` / `tools/list` / `tools/call`, tracks the `Mcp-Session-Id` header, and parses both JSON and SSE responses. Each connected server's tools are appended to the schemas offered to the model and executed on call. (Config is `name` + `url` + optional `headers`.)

---

## YAML everywhere

One of Zod's signatures is its **hand-rolled aligned YAML formatter** (`utils/yaml.js`, `formatAlignedYaml`):

- Parses via `js-yaml`, re-emits with **all mapping colons aligned to a single global column**.
- Chooses inline vs. block layout based on a max-line budget (default 80, but **re-measured live** from the editor width).
- **Wraps long scalar values** across lines at the value column — e.g. a long API key wraps like:

```yaml
providers:
  - name        : OpenRouter
    baseUrl     : https://openrouter.ai/api/v1
    apiKey      : sk-or-v1-REPLACE-ME-00000000000000
                  0000000000000000000000000000000000
    model       : openrouter/free
    enabled     : true
```

- Used by the **providers**, **memory**, **tools**, and **MCP** editors, and by the `yaml_format` tool.

The editor UI itself is the "**Socratic editor**": each YAML line is rendered with syntax-aware highlighting (keys in one color, quoted strings, numbers, booleans as clickable toggles, `$ENV` vars, URLs as links, secret keys masked with `••••••••` unless "show API keys" is on). Editing is line-by-line (click to edit, Enter to split with smart indent, Backspace to merge, Tab indents). Every section also has an **"Ask AI"** input that sends the current YAML to the provider and asks it to return a complete, valid replacement document.

The **orchestrator** is a second, similar editor but for workflow text: the line format (`# title`, `## @step:x`, `@tool:x`, `@skill:x`, `→ @goto:x`) converts to and from strict YAML (`title` + `steps[]` with `tools`, `skills`, `gotos`).

---

## Project structure

```
zodagent/
├── index.html                 # Skeleton page; pulls in views via @import
├── style.css                  # Tailwind v4 + design system (themes, glass, grid, editors)
├── vite.config.js             # Vite + Tailwind + custom @import-inline plugin
├── package.json
├── arch.md                    # Formal data model for the agent runtime (sessions/crons/LLM loop)
├── public/
│   ├── favicon-dark.svg
│   ├── manifest.webmanifest   # PWA manifest
│   ├── sw.js                  # Service worker (offline cache + background scheduler)
│   └── wallpapers/            # 7 bundled wallpapers
├── dist-web/                  # Production build output
└── src/
    ├── html/                  # UI regions (views), inlined by the build
    │   ├── head.html
│   ├── splash.html
│   ├── hub.html
│   ├── messages.html
│   ├── chat-input.html
│   ├── editor-drawer.html
│   ├── settings-drawer.html
│   ├── sessions-drawer.html
│   ├── scheduler-drawer.html
│   └── logo.svg.html
└── tests/
    ├── journeys.mjs       # Driver-agnostic 14-journey suite (116 checks)
    ├── e2e.mjs            # CDP driver for the suite (npm test)
    ├── pw-e2e.mjs         # Playwright driver + Journey 15: SW background agents (123 checks)
    ├── real-e2e.mjs       # Playwright + real OpenRouter free model (28 checks)
    ├── cdp.mjs            # Minimal Chrome DevTools Protocol driver
    └── mock-server.mjs    # Mock OpenAI + MCP servers for the suite
    └── js/
        ├── main.js            # Bootstrap: stores, components, resizable drawers, scheduler
        ├── zod.js             # Core engine: Provider, streaming, tools loop, output parser
        ├── engine/
        │   └── runner.js      # Workflow execution harness (yamlToSteps → step loop)
        ├── components/
        │   ├── workspacePage.js      # The chat workspace component
        │   ├── preferencesPanel.js   # Settings component + YAML editors
        │   └── schedulerPanel.js     # Scheduler drawer component
        ├── stores/
        │   ├── settings.js    ├── agents.js     ├── sessions.js
        │   ├── harnesses.js   ├── skills.js     ├── ui.js
        │   ├── dd.js          ├── tools.js      └── crons.js
        └── utils/
            ├── yaml.js        ├── socraticEditor.js   ├── editor.js
            ├── tools.js       ├── memory.js     ├── rendering.js
            ├── icons.js       ├── braille.js    ├── storage.js
            ├── bgSync.js      ├── agent.js      ├── mcp.js
            ├── schedule.js    ├── scheduler.js
            └── defaults.js
```

---

## Getting started

Requires Node.js 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server (LAN-accessible)
npm run dev
#   → open the printed http://localhost:5173 URL

# 3. Production build (outputs to dist-web/)
npm run build

# 4. Preview the production build
npm run preview
```

### Tests

The project ships three end-to-end suites that build the app and drive it in **real Chrome**, backed by mock OpenAI (`/chat/completions`) and MCP (JSON-RPC) servers:

1. **CDP suite** (`tests/e2e.mjs` + `tests/journeys.mjs`) — drives 14 user journeys in headless Chrome via the DevTools Protocol: hub, streaming chat, tool calls, custom + MCP tools, session/harness drawers, scheduler, settings/YAML editors, file upload, and workflow runs — **116 checks**.
2. **Playwright suite** (`tests/pw-e2e.mjs`) — runs the *same* 14 journeys through Playwright/Chromium (service workers enabled) plus **Journey 15: background service-worker agents** — **123 checks**.
3. **Real-provider suite** (`tests/real-e2e.mjs`) — drives the live UI against a **real OpenRouter free model** (e.g. `google/gemma-4-26b-a4b-it:free`) to confirm streaming chat, the tool loop, workflow runs, the scheduler, session data, persistence, and the background SW agent all work against a real LLM — **28 checks**. Requires `OPENROUTER_API_KEY`.

```bash
# CDP suite: production build + headless-Chrome e2e (needs Chrome/Chromium)
npm test
npm run test:e2e       # e2e only (assumes a fresh build)

# Playwright suite (same journeys + service-worker background agents)
npm run test:pw

# Real OpenRouter free-model suite
OPENROUTER_API_KEY=sk-or-... npm run test:real
```

Each run uses a fresh web root and Chrome profile (unique ports), so it is safe to run repeatedly without stale-service-worker interference.

**What the 15 journeys cover:**

| # | Journey | Verifies |
|---|---|---|
| 1 | Boot + providers | Alpine boots, default provider picked, all 11 built-in tool schemas offered, provider YAML editor renders/saves, key masking, `/models` autocomplete |
| 2 | Chat | SSE streaming, tool-call loop feeds `calculator` result back, thinking/badges/findings/todos/code cards parse, message copy/regenerate/delete/rate |
| 3 | Commands/mentions/files | `/` slash commands, `@` mention pickers, paperclip file attach + content embedded in the LLM request |
| 4 | Sessions + harnesses | add/search/rename/delete/switch sessions; harness CRUD; harness md → 2 default steps |
| 5 | Orchestrator | line-format ⇄ YAML, Enter-split editing, "ask AI" edit, run a 2-step workflow to a `workflowRun` card |
| 6 | Scheduler | prefilled prompt, once + interval tasks, run-now fires the agent loop, toggle/delete, `timer` tool fires a message |
| 7 | Session data | persistent Tasks / Notes / Data CRUD |
| 8 | Settings tabs | theme switch, wallpaper CSS var, grid toggle, memory/tools/MCP YAML tab edits save |
| 9 | Custom tools | user YAML tool appears in schemas, sandbox `implementation` runs, `ctx.state` visible |
| 10 | MCP | JSON-RPC discovery + tool call through the shared dispatcher against a mock server |
| 11 | Built-in tools | direct runs of calculator, random, time, memory, todo, notes, data_store, code_tools (aligned YAML), timer, confirm, clipboard |
| 12 | Persistence + PWA | seeded state loads; sessions/settings/crons survive reload; manifest + `sw.js` in build output |
| 13 | Workflow runner | `@goto contains:` condition jumps steps, unknown-tool step tolerated |
| 14 | Plan confirm | `[confirmation]` plan card renders, approve/reject works, `confirm` modal resolves |
| 15 | Background agents | service worker available; two scheduled crons picked up by the SW and run to `done` with a reply; each creates its own session (user prompt + assistant reply); results persist across reload |

**Not yet covered** (candidates for future journeys): provider retry/timeout/rate-limit/fallback failure injection, daily/weekly cron firing and cron→workflow triggers, the workflow infinite-loop guard, several structured-output renderers (`security-warning`, `tool:`, `team-feedback`, `viz`, `html`, `files`, `divider`, `task-completed`), clipboard read, MCP error/SSE/session-id paths, settings AI-edit flows, and the export→import backup round-trip.

### First-run setup
1. Open **Settings** → **Providers** (or **General**).
2. Add a provider — e.g. OpenRouter:
   - **Name**: `OpenRouter`
   - **Base URL**: `https://openrouter.ai/api/v1`
   - **API key**: your key
   - **Model**: `gpt-4o` (or `openrouter/free`, etc.)
3. Click **Save**, then set it as the **default provider** in General.
4. Optionally pick a **fallback provider** and tune **timeout / retries / rate limit**.
5. Start chatting on the hub, or click the **calendar-clock Schedule** button in the chat bar to schedule a prompt to run later.

> API keys are stored **only** in your browser's `localStorage`. They are sent only to the provider `baseUrl` you configured.

---

## Configuration

All configuration is done through the **Settings drawer** and is persisted locally:

- **Providers** — multiple providers with name, base URL, API key, model, enabled flag; model list auto-fetched from each provider's `/models` endpoint.
- **System prompt** — the default instructs Zod to optionally use the `[section]` markers (thinking, badges, findings, suggestions, todos, code, html, etc.).
- **Request tuning** — timeout (30s–300s), retries (0–10), rate limit RPM (unlimited/60/120/300), request logging.
- **Appearance** — 36 themes, 7 wallpapers + none, background opacity/blur, panel opacity/blur, grid toggle/opacity, answer font.
- **Memory / Tools / MCP** — YAML-edited persistent state.

---

## Porting: Desktop & Chrome extension

Zod is a static HTML/CSS/JS app. The same `src/` can ship as a web app, a **desktop app**, or a **browser extension** — the browser-API list above ([Client-side only](#client-side-only--its-all-browser-apis)) is the entire platform surface.

### Desktop (Tauri recommended)

Wrap `dist/` in a Tauri or Electron shell:

- **Tauri**: point `frontendDist` at `dist/`; Rust side needs no custom code (no Node APIs are used). ~2–4 MB binary vs Electron's ~90 MB.
- **Electron**: `BrowserWindow.loadFile('dist/index.html')`. Optional Node access to real FS/DBs later.

Extensions worth doing once on desktop: global hotkey to summon, tray quick-reply, real notifications, file-system tool access.

### Chrome extension (MV3)

An extension is basically the same app + a manifest:

1. Add `manifest.json` with `action`, `host_permissions` for the providers you use, and `options_ui` pointing at `dist/index.html`.
2. The three browser-API touchpoints map directly:
   - `localStorage` → works in `options_ui` (or switch to `chrome.storage.local`).
   - Scheduler → replace `setInterval` with `chrome.alarms` so crons fire even when the popup/options page is closed.
   - Notifications → `chrome.notifications` instead of the Web `Notification` API.
3. Because there's no server, **no CSP exceptions and no remote code** are needed — it's extension-store friendly.

### Porting checklist

1. Abstract the three touchpoints behind the existing modules: `storage.js` (persistence), `schedule.js` (timer), and the notification call in `scheduler.js`.
2. The workflow execution harness (status item #1), cron→workflow triggers (#2), custom-tool runtime (#3), and MCP client (#4) are already done, so the app is agentic out of the box before you port.
3. Multi-agent collaboration (#6) is the last runtime milestone.

---

## What you can build with this

Because the core (provider loop + tool loop + YAML config + scheduler) is finished and all rendering is client-side, Zod is a working foundation for:

- **A personal research agent** — enable `web_search`/`web_scrape` tools, point the system prompt at `[sections]`, have it dump findings into persistent Notes/Data.
- **A self-hosted coding helper** — hook a local provider (Ollama/LM Studio), use `code_tools` + the code block renderer, share `[code]` plans with Approve/Reject confirmation.
- **A task scheduler with AI follow-up** — crons fire prompts *or whole workflows* (pick a harness in the scheduler), so you get "run this workflow at 9am daily".
- **A demo/teaching harness** — the orchestrator + card renderers let you show tool-calling, structured output, and confirmations without any backend.
- **A quick desktop utility** — port to Tauri and you get a tray agent; the extension path gives you an always-available assistant in any tab.

---

## Roadmap

The full gap list with implementation notes lives in [Project status](#project-status). The execution harness (#1), cron→workflow triggers (#2), custom-tool runtime (#3), MCP client (#4), PWA (#7), file uploads (#8), backup/import (#9), and background scheduler durability (#11) are **done**. Priorities, in order:

1. **Multi-agent collaboration** — shared sessions with per-step sub-loops (modeled in `arch.md`).
2. **Skills in plain chat** — surface the harness skill hints in the normal chat loop too.
3. **Always-on durability** — for the extension target, move the background scheduler onto `chrome.alarms` + `chrome.storage.local` so crons fire even when the browser is fully closed.

---

*Zod Agent — local-first, provider-agnostic, YAML-configured agentic chat. Make it yours.*
