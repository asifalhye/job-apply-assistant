# Job Apply Assistant

A **local-first** desktop tool that helps you apply to jobs faster — without sending your resume to yet another SaaS product.

It remembers your answers, auto-fills application forms, generates paragraph responses from your own materials, and learns as you apply. Everything runs on **your machine**. Your data stays in a local SQLite database.

Built as an alternative to browser extensions like Simplify and OwlApply, with better support for dropdowns, long-form answers, Workday pain points, and multi-LLM choice (Claude, ChatGPT, Ollama).

---

## Table of Contents

- [What Problem This Solves](#what-problem-this-solves)
- [What Was Built](#what-was-built)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First-Time Setup (Walkthrough)](#first-time-setup-walkthrough)
- [Daily Usage](#daily-usage)
- [Chrome Extension](#chrome-extension)
- [LLM Configuration](#llm-configuration)
- [Supported Job Application Platforms](#supported-job-application-platforms)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Data & Privacy](#data--privacy)
- [Backup & Export](#backup--export)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## What Problem This Solves

Job applications are repetitive and fragile:

| Pain point | How this tool helps |
|------------|---------------------|
| You re-type the same answers every time | Snippet library + question bank remembers them |
| Extensions miss dropdowns and dates | Dedicated form engine with combobox + date parsing |
| Long behavioral questions take forever | RAG pulls from resume + snippets + job description |
| Workday makes you create a new account every time | Per-tenant Workday account tracker (encrypted locally) |
| Premium extensions gate basic features | Fully local, open setup — you bring your own API keys |
| You lose good answers across applications | Learning loop saves corrected answers as reusable snippets |

**What it does not do:** bypass CAPTCHAs, MFA, bot detection, or auto-submit applications. You always review and submit manually.

---

## What Was Built

This repo is a complete monorepo with **33 functional units** across 10 phases:

### Core application

| Component | Description |
|-----------|-------------|
| **Local API** (`apps/api`) | Fastify server on port 3001 — profile, documents, snippets, LLM, browser runner |
| **Web UI** (`apps/ui`) | React control panel on port 5173 — profile, run applications, settings |
| **SQLite database** (`packages/storage`) | All data stored locally in `./data/local.db` |
| **Browser automation** | Playwright opens real Chrome, extracts fields, fills forms |

### Intelligence layer

| Component | Description |
|-----------|-------------|
| **Form engine** (`packages/form-engine`) | Detects field types, normalizes questions, parses dates, ranks dropdown options |
| **ATS adapters** (`packages/ats-adapters`) | Greenhouse, Ashby, Workday, Lever, generic fallback |
| **RAG** (`packages/rag`) | Chunks resume/documents, embeds locally, retrieves relevant context |
| **LLM router** (`packages/llm`) | OpenAI, Anthropic Claude, Ollama, stub — with balanced/quality/local modes |

### Extra features

| Component | Description |
|-----------|-------------|
| **Question bank** | Deduplicates and clusters similar questions across applications |
| **Learning loop** | Saves your manual edits as new snippets for reuse |
| **Workday accounts** | Encrypted per-company tenant credentials |
| **Chrome extension** (`extension/`) | Observe forms + get answer suggestions while browsing |
| **Backup/export** | JSON export of profile, snippets, questions, applications |
| **Onboarding wizard** | First-run setup for profile + resume + LLM |
| **CI pipeline** | GitHub Actions for lint, build, and tests |

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  React UI   │────▶│  Local API   │────▶│  SQLite DB      │
│  :5173      │     │  :3001       │     │  ./data/        │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Playwright  │──▶ Opens job application in Chrome
                    │  Browser     │──▶ Extracts fields → proposes values
                    └──────┬───────┘──▶ Fills form (you review + submit)
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        Profile map   Snippet match   RAG + LLM
        (email, etc.) (reuse answers) (generate paragraphs)
```

**Typical flow:**

1. Paste a job application URL (e.g. Greenhouse)
2. Tool detects the ATS type and extracts all form fields
3. It maps fields to your profile, saved snippets, or generates new answers
4. You review proposed values in the UI
5. Click **Fill Form** — Playwright fills the browser
6. You complete CAPTCHA/MFA manually if needed, then submit yourself
7. Questions and corrected answers are saved for next time

---

## Prerequisites

You need three things before running this project:

### 1. Node.js 20+ (required)

This project is a Node.js application. If you see:

```
Error: Node.js is required. Install from https://nodejs.org
zsh: command not found: npm
```

**Node.js is not installed.** Install it first:

#### macOS (recommended)

**Option A — Official installer (easiest for non-developers)**

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (20.x or 22.x)
3. Run the installer
4. **Quit and reopen Terminal** (important)
5. Verify:

```bash
node -v    # should print v20.x.x or v22.x.x
npm -v     # should print 10.x.x or similar
```

**Option B — Homebrew**

```bash
brew install node
node -v
npm -v
```

**Option C — nvm (for developers who switch Node versions)**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Restart terminal, then:
nvm install 20
nvm use 20
node -v
```

#### Windows

1. Download LTS from [https://nodejs.org](https://nodejs.org)
2. Run installer (check "Add to PATH")
3. Open a new Command Prompt or PowerShell
4. Run `node -v` and `npm -v`

#### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 2. Git

Needed to clone the repo.

```bash
git --version
```

Install from [https://git-scm.com](https://git-scm.com) if missing.

### 3. Google Chrome

Playwright uses Chromium (installed automatically during setup). Chrome itself is also fine for the extension.

---

## Installation

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/job-apply-assistant.git
cd job-apply-assistant
```

Or if you already have the folder locally:

```bash
cd job-apply-assistant
```

### Step 2 — Run setup (one command)

```bash
chmod +x setup.sh
./setup.sh
```

This script:

1. Checks that Node.js and npm exist
2. Runs `npm install`
3. Builds all internal packages
4. Creates the SQLite database
5. Seeds default settings
6. Copies `.env.example` → `.env`
7. Installs Playwright's Chromium browser

**Expected output ends with:**

```
=== Setup complete ===

Start the app:
  npm run dev

Then open: http://localhost:5173
```

### Step 3 — Start the app

```bash
npm run dev
```

Open in your browser:

| Service | URL |
|---------|-----|
| **UI (main app)** | http://localhost:5173 |
| **API (backend)** | http://localhost:3001 |
| **Health check** | http://localhost:3001/health |

### Manual setup (if you prefer)

```bash
npm install
npm run build:packages
npm run db:migrate
npm run db:seed
cp .env.example .env
npx playwright install chromium
npm run dev
```

---

## First-Time Setup (Walkthrough)

When you first open http://localhost:5173, an **onboarding wizard** guides you through:

### 1. Profile

Enter basics used on almost every application:

- First / last name
- Email, phone
- LinkedIn, GitHub, portfolio URLs
- Address, work authorization, sponsorship needs
- Salary range, start date, relocation preference

You can fill in more later on the **Profile** page.

### 2. Resume upload

Upload your resume (PDF or DOCX). The tool:

- Stores it locally in `./data/uploads/`
- Parses text for RAG search
- Uses it as the primary file for form upload fields

### 3. LLM setup

Choose how answers are generated:

| Mode | Best for | Cost |
|------|----------|------|
| **local-only** | Privacy, no API keys | Free (needs Ollama) |
| **balanced** | Good quality, reasonable cost | Low–medium |
| **quality** | Best paragraph answers | Medium |

Add API keys on the **Settings** page (encrypted locally):

- **OpenAI** — [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Anthropic (Claude)** — [console.anthropic.com](https://console.anthropic.com)
- **Ollama (free/local)** — [ollama.com](https://ollama.com) then `ollama pull llama3.2`

Without any keys, the app still runs using a **stub provider** (placeholder text for testing the flow).

### 4. Add answer snippets (recommended)

Go to **Snippets** and save answers you reuse often:

- "Why do you want to work here?"
- "Tell us about a time you led a team"
- Work authorization explanation
- Cover letter paragraphs

These are matched automatically during form fill.

---

## Daily Usage

### Apply to a job (Greenhouse / Ashby — best supported)

1. Open **Run Application** in the sidebar
2. Paste the job URL, e.g.:
   ```
   https://boards.greenhouse.io/company/jobs/123456
   ```
3. Click **Start & Extract Fields**
   - A Chrome window opens with the application page
   - The tool detects the ATS and lists all fields with proposed values
4. Review each field in the UI:
   - Edit values directly
   - Click **Generate Answer** for long questions
5. Click **Fill Form**
   - Playwright fills the browser
   - Resume is uploaded if a primary resume is set
6. **Review in the browser** — fix anything the tool missed
7. **Submit manually** — auto-submit is intentionally disabled
8. Click **Stop Browser** when done

### Workday applications

Workday is harder (separate account per company, multi-step forms, CAPTCHA).

1. Save the company's Workday tenant on **Workday Accounts**
   - Tenant ID = the company slug in the URL: `myworkdayjobs.com/COMPANYNAME/...`
   - Store email + password (encrypted locally)
2. Use **Run Application** with the Workday URL
3. When CAPTCHA or MFA appears, complete it manually in the browser
4. The tool fills profile sections step by step; you review each page

### Reuse learned answers

Every application saves:

- Questions encountered → **Questions** page
- Answers you used → linked to snippets
- Edits you made → saved as new **learned** snippets

Next time you see the same question, the tool reuses your previous answer.

---

## Chrome Extension

The extension connects to your **local app** — it does not work standalone.

### Install

1. Make sure the local app is running (`npm run dev`)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension/` folder from this repo

### Use

| Action | What it does |
|--------|--------------|
| **Open Sidebar** | Shows connection status + actions on the current page |
| **Capture Questions** | Sends visible form fields to your local question bank |
| **Suggest for Focused Field** | Generates an answer for the field you're typing in |

The extension badge shows whether the local API at `localhost:3001` is reachable.

---

## LLM Configuration

### Via Settings page (recommended)

Open **Settings** in the UI:

- Set **LLM Mode** (local-only / balanced / quality)
- Enter API keys (stored encrypted in SQLite)
- Set Ollama URL (default: `http://localhost:11434`)
- Click **Test LLM** to verify

### Via `.env` file

Copy and edit:

```bash
cp .env.example .env
```

```env
# Optional API keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (free local models)
OLLAMA_BASE_URL=http://localhost:11434

# App ports
API_PORT=3001
UI_PORT=5173

# Local data directory
DATA_DIR=./data

# Encrypt stored API keys and Workday passwords
ENCRYPTION_KEY=change-me-to-a-long-random-string
```

### Mode routing

| Mode | Classification (cheap tasks) | Generation (paragraphs) |
|------|------------------------------|---------------------------|
| `local-only` | Ollama llama3.2 | Ollama llama3.2 |
| `balanced` | GPT-4o-mini (or stub) | Claude Sonnet (or GPT-4o) |
| `quality` | Claude Sonnet | Claude Sonnet |

---

## Supported Job Application Platforms

| Platform | Support level | Notes |
|----------|---------------|-------|
| **Greenhouse** | ✅ Strong | Primary target. Text, select, checkbox, radio, file upload |
| **Ashby** | ✅ Strong | Combobox / React-select style dropdowns |
| **Lever** | ⚠️ Basic | Lever-specific + generic fallback |
| **Workday** | ⚠️ Partial | Multi-step, account assist, manual CAPTCHA/MFA required |
| **Generic** | ⚠️ Basic | Unknown career pages — conservative fill, more prompts |

Detection is automatic from the URL and page content.

---

## Project Structure

```
job-apply-assistant/
├── apps/
│   ├── api/                 # Fastify backend + Playwright runner
│   │   └── src/routes/      # profile, documents, snippets, runner, llm, workday…
│   ├── ui/                  # React + Vite frontend
│   │   └── src/pages/       # Profile, Run, Snippets, Settings…
│   └── browser-runner/      # Optional CLI wrapper for runner API
├── packages/
│   ├── storage/             # SQLite schema, migrations, seed
│   ├── form-engine/         # Field detection, dates, question matching
│   ├── ats-adapters/        # Greenhouse, Ashby, Workday, Lever, generic
│   ├── llm/                 # OpenAI, Anthropic, Ollama providers + router
│   ├── rag/                 # Document chunking, embeddings, retrieval
│   └── profile/             # Profile field mapping helpers
├── extension/               # Chrome MV3 extension
├── data/                    # Local data (gitignored except .gitkeep)
│   ├── local.db             # SQLite database
│   ├── uploads/             # Resumes, cover letters
│   └── backups/             # Exported JSON backups
├── .github/workflows/       # CI (lint, build, test)
├── setup.sh                 # One-command setup script
├── .env.example             # Environment template
└── README.md                # This file
```

---

## Architecture Overview

### Storage (`packages/storage`)

SQLite via Drizzle ORM. Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | Your personal/application info |
| `documents` | Uploaded resumes, cover letters |
| `snippets` | Reusable answer library |
| `questions` | Questions seen across applications |
| `applications` | Job application history |
| `application_fields` | Field-level fill log per application |
| `field_fill_events` | Learning/audit trail |
| `document_chunks` | RAG embedding chunks |
| `workday_accounts` | Encrypted per-tenant credentials |
| `settings` | LLM keys and preferences (encrypted) |

### Form engine (`packages/form-engine`)

- Classifies inputs: text, textarea, email, phone, date, select, combobox, checkbox, radio, file
- Normalizes question text for deduplication
- Maps labels to profile fields ("Email Address" → `profile.email`)
- Parses dates: `June 2021`, `06/2021`, `Present`, etc.
- Ranks dropdown options by fuzzy match

### ATS adapters (`packages/ats-adapters`)

Each adapter implements the same interface:

```
detect → extractJobInfo → extractFields → fillField → uploadResume
```

Shared fill strategies handle native selects, ARIA comboboxes, and React-select-style dropdowns.

### RAG (`packages/rag`)

1. Resume uploaded → text extracted → split into sections (experience, education, skills…)
2. Sections chunked and embedded locally (hash-based embeddings — no external API needed)
3. On answer generation: retrieve top chunks + matching snippets + job description
4. LLM generates answer **grounded in retrieved context only**

### API routes

| Route prefix | Purpose |
|--------------|---------|
| `GET/PUT /profile` | Profile CRUD |
| `/documents` | Upload, list, delete, set primary resume |
| `/snippets` | Answer library CRUD + search |
| `/questions` | Question bank + clustering |
| `/applications` | Application history + learning |
| `/settings` | LLM keys and preferences |
| `/llm` | Test provider, generate answers |
| `POST /runner/start` | Open job URL, extract fields |
| `POST /runner/fill` | Fill approved values in browser |
| `/workday` | Workday account management |
| `/backup` | Export/import JSON |
| `/extension` | Chrome extension bridge |

---

## Data & Privacy

- **Everything is local by default.** Data lives in `./data/` on your machine.
- **API keys** are encrypted with AES-256-CBC using `ENCRYPTION_KEY` from `.env`.
- **Workday passwords** are encrypted the same way.
- **No telemetry.** No analytics. No account required.
- **LLM calls** only happen when you configure a provider — your data is sent to OpenAI/Anthropic only when you opt in.
- **Ollama mode** keeps everything on your machine with zero external API calls.

The `./data/` folder is gitignored. Never commit `.env` or `data/local.db`.

---

## Backup & Export

### Export

In the UI: **Settings → Export Backup**

Or via API:

```bash
curl http://localhost:3001/backup/export
```

Saves JSON to `./data/backups/jaa-backup-<timestamp>.json` containing profiles, snippets, questions, and applications.

### Import

```bash
curl -X POST http://localhost:3001/backup/import \
  -H "Content-Type: application/json" \
  -d '{"filepath": "./data/backups/your-backup.json"}'
```

---

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build packages + start API + UI |
| `npm run build` | Build all workspaces |
| `npm run build:packages` | Build internal packages only |
| `npm run test` | Run unit tests (form-engine, etc.) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Create/update SQLite tables |
| `npm run db:seed` | Seed default profile + settings |
| `npm run setup` | install + migrate + seed |

### Run tests

```bash
npm run test
```

Tests cover date parsing, question normalization, profile field matching, and question categorization.

### CLI runner (optional)

With the API running:

```bash
npx tsx apps/browser-runner/src/index.ts "https://boards.greenhouse.io/company/jobs/123"
```

---

## Troubleshooting

### `command not found: npm` or `Node.js is required`

Node.js is not installed or not in your PATH.

1. Install Node.js LTS from [nodejs.org](https://nodejs.org)
2. **Quit and reopen Terminal completely**
3. Run `node -v` — must print a version number
4. Then re-run `./setup.sh`

### `EACCES` or permission errors during npm install

Do not use `sudo npm install`. Fix npm permissions:

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### Port 3001 or 5173 already in use

```bash
# Find what's using the port (macOS)
lsof -i :3001
lsof -i :5173

# Or change ports in .env
API_PORT=3002
```

### Playwright browser doesn't open

```bash
npx playwright install chromium
```

On Linux you may also need system dependencies:

```bash
npx playwright install-deps chromium
```

### Extension shows "Local app not running"

1. Confirm `npm run dev` is running
2. Visit http://localhost:3001/health — should return `{"status":"ok"}`
3. Reload the extension in `chrome://extensions`

### LLM test returns stub/placeholder text

No API keys configured. Either:

- Add keys in **Settings**, or
- Install Ollama and set mode to **local-only**, or
- Accept stub responses for testing the fill flow

### Form fill misses fields

- Review and edit values in the UI before clicking Fill
- Some custom React components need adapter updates — file an issue with the job URL
- Workday and generic sites require more manual review

### Database reset

```bash
rm -f data/local.db
npm run db:migrate
npm run db:seed
```

---

## Known Limitations

| Limitation | Reason |
|------------|--------|
| No CAPTCHA/MFA bypass | By design — legal and ethical boundary |
| No auto-submit | You must review every application |
| EEO/demographic fields not auto-filled | Requires explicit user-provided answers |
| PDF parsing is basic | Scanned PDFs may not extract well — use text-based PDFs |
| Workday varies by tenant | Each company's Workday instance differs |
| Embeddings are local/hash-based | Good enough for personal use; not OpenAI embedding quality |
| Extension requires local app | Not a standalone cloud extension |

---

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add tests for form-engine changes
4. Open a pull request

When adding ATS support, implement a new adapter in `packages/ats-adapters/src/` following the `AtsAdapter` interface.

---

## License

MIT — use freely, modify, distribute. No warranty.

---

## Quick Reference Card

```
# First time
./setup.sh
npm run dev
→ http://localhost:5173

# Apply to a job
Run Application → paste URL → Start → review → Fill → submit manually

# Add API keys
Settings → OpenAI / Anthropic / Ollama

# Save an answer for reuse
Snippets → New Snippet

# Workday
Workday Accounts → save tenant + credentials → Run Application

# Extension
chrome://extensions → Load unpacked → extension/ folder
```
