# Zod: what the product is (internal source of truth, not site copy)

Written from the Zod repository (`zodagent/zodagent`) as of November 2026. When this and the app disagree, the app is right: fix this file.
The earlier version of this file described a browser-only app that kept everything in `localStorage`; that Zod no longer exists.

## What it is

Zod is a **local-first agent workspace**: one app for chat, search, routines and connectors. It runs on your computer (an Electrobun desktop app, a
browser tab served by Bun, or a container) and works offline except for the linked chat model. There is no account, no sign-in and no Zod
server. Whoever opens it is the owner. Data lives in files on this computer (`~/.zodagent/` by default), in a **vault** you can back up.

Under the shell is an engine: a system-intelligence and supervised-execution layer. It models how a system works (components, resources,
constraints), discovers what can really be done through declared capability contracts, plans, asks a person to approve restricted actions,
executes through real adapters and reads the owning system back to verify. It refuses, and says why, when an operation is not supported.

Beta, available by invitation. Proprietary (the repository currently carries MIT; the owner has not decided the final licence).

## The parts of the app

- **Chat and agent.** The chat runs on pi-durable. Any OpenAI-compatible provider works: Settings > Model provider is a searchable list
  (OpenRouter by default, with free models; OpenAI, Anthropic, Google Gemini, Groq, Mistral, DeepSeek, xAI, Together, Ollama, LM Studio and
  more) plus Advanced for any other address. Anything that writes, deletes, installs or schedules asks first (Allow / Deny) unless Auto is on.
  Without a model, the chat says so and links to Settings.
- **Search.** One bar over pages, connectors, chats, routines and settings, with a filter language (`in:routines`, `is:error`, `after:30d`,
  `limit:20`). Any sentence of three words or more also gets an **Ask Zod to do this** row. If the words find nothing, the linked model is asked what was meant.
- **Routines.** What Zod does on its own (`in:routines`). A routine is a goal, a script that runs with no model (so a run costs no tokens),
  when it runs, and what it may do alone (grants you approve for that exact script). Zod makes them: you ask in a chat ("set me up…",
  "make a routine that…", or a link to an agent, skill or workflow it should learn from), and its **live panel** opens beside the chat as it
  works. The page has **Explore** (ideas; one click opens a chat where Zod makes it) and **Mine** (a switch each, a calendar and the latest
  runs). Five routines come with Zod (morning briefing, health check, connector watch, routine doctor, weekly review) and five run by hand
  with arguments. When a run fails Zod writes a lesson and suggests a fix you apply in one tap. Home shows **What's new for you**: the cards
  those routines produce. Runs are durable: one cut off by a stop is reported, not repeated.
- **Connectors.** MCP servers (a program Zod starts, or an address). **Explore** lists what Zod could connect (a click opens a chat where
  Zod installs it) and the MCP registry; **Connected** has a switch each. Zod adds them when asked, headless or through the app's own
  screens; each tool keeps an Allow / Ask / Off policy. The chat's side panel has a Connectors tab with every tool and what it did. Zod is
  also an MCP server at `/mcp` (`capability_find`, `capability_do`, `script_run`, the routine tools; reads are free, a change needs
  `confirm: true`, a remote caller is read-only). There is no plugin system.
- **Soul.** Who Zod is, as small parts (identity, voice, values, care, initiative) on the Soul page. Zod composes them when asked
  (including presets: Accountant, Coach, Researcher, Minimalist, Companion, Operator); you switch parts on or off. What is on goes into
  its instructions in every chat.
- **Learn, set up, tour.** `/learn` puts a saved guide to the whole app in the chat, `/setup` checks this computer and walks you to a full setup for what you want to use Zod for, and `/tour` walks you around the real screens. All three answer at once with no model.
- **Slash commands and mentions.** `/routine`, `/connect`, `/import`, `/fix`, `/soul`, `/status` start a sentence Zod carries
  out; `/new`, `/clear`, `/resume`, `/rename`, `/export` manage the chat; `/routines`, `/connectors`, `/soul`, `/settings` go to pages;
  `/its-name` runs a routine. `@[Title]` hands Zod a routine, connector, agent or chat.
- **Operations and the system builder.** One screen over the append-only event ledger (events, entities, resources, obligations, plans,
  attention, system designs). The builder surveys what exists, writes a design, builds it in stages, verifies it and records what happened.
- **Vaults.** Separate workspaces (title bar switcher), each with its own chats, settings, routines, agents and look.
- **Messaging.** A gateway pairs chat apps so a routine's result can be sent to a person.
- **Chrome extension (Zod Browser).** A side panel with a chat, the whole app one click away, a small Zod tab on every website and, with
  Browser control on, an agent that can use your tabs. It pairs with the desktop app by itself.
- **Safety.** Browser control, remote control of this computer and terminal access are tools you switch on on purpose; each action asks first
  unless Auto is on. Keys stay on this computer and are sent only to the provider address.

## What was removed (so old copy is wrong if it mentions these)

- **Memory (Knowledge)**, with its notes, tools and pages. **Skills** and **Flows** (the step language): routines with scripts took their place; the dork verbs, the Flows page and the step editor are gone. **The plugin
  system**: Zod's parts are part of Zod, and outside things are MCP servers. **The SDK** (`@zod/sdk`). **Hubs and the Library page.**
- **Books** (accounting) lives in its own repository, `zodagent/books`. It used to load as a plugin; it can no longer, and the way to
  reach it is still being decided. Do not promise it on the site.
- Zod's own page and UI-block language (`zod-ui`, `zod-page`) is obsolete; MCP Apps are the direction. Connectors and routines are no longer added or edited by hand: Zod does it when asked; people only switch them on or off.

## Stack and layout

Plain JS (ESM) on Bun. Server: Bun.serve (SPA, `/api/*`, `/mcp`, the chat WebSocket), SQLite, pi-durable for the agent. Client: Alpine.js with
Tailwind and DaisyUI. Desktop: Electrobun. Tests: `bun test tests/unit` (900+, no network, no model) and browser tests in Chrome.
Quality gates: Biome (lint and format), knip (dead code), a file-size ratchet and a type-check ratchet, in CI and pre-commit.
Key folders: `src/server/<part>/` and `src/client/<part>/` for each part, `src/shared/` for code both sides import, `extension/chrome/` for
the extension.

## Positioning (for copy)

A local-first agent workspace: chat, search, routines and connectors in one app, on your computer, with any model and no account.
Honest limits: a beta; the model must be linked for chat; Books is not bundled; some screenshots on the site predate the latest changes.
