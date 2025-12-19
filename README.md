# 🧠 Codebase Context Packer  
### Turn any codebase into AI-ready context — locally, securely, intelligently.

> **A zero-server, privacy-first developer tool that converts real project folders into structured context optimized for Large Language Models (LLMs).**

---

## 🚀 Why this project exists

Modern AI tools like ChatGPT, Claude, and Gemini are powerful — but they have a fundamental limitation:

> **They cannot see your local project structure, file relationships, or full codebase context.**

Developers are forced to:
- Manually copy files
- Paste partial snippets
- Lose architectural context
- Waste tokens on irrelevant files

**Codebase Context Packer solves this problem.**

It transforms an entire project folder into a **clean, filtered, structured representation** that an AI can actually understand — without uploading a single byte to any server.

---

## ✨ What it does (in simple terms)

- 📂 Select a **local project folder**
- 🧹 Automatically **filters noise**
  - `node_modules`
  - `.git`
  - build artifacts
  - binary files
- 🧠 Understands **project structure**
- 🧾 Generates **LLM-friendly output**
- 🔐 Runs **100% in your browser**

**No backend. No uploads. No tracking.**

---

## 🔒 Privacy by design (important)

> **Your code never leaves your machine.**

- All processing happens **locally in the browser**
- Uses the browser File API (`webkitdirectory`)
- No servers
- No APIs
- No analytics
- No data collection

This makes the tool safe for:
- Proprietary code
- Company projects
- Interview prep
- Client work

---

## 🧩 Key features

### 🗂 Smart File Processing
- Recursive folder reading
- Ignore rules similar to `.gitignore`
- Skips binaries & large assets
- Custom ignore patterns via UI

### 🧠 AI-Optimized Output
- Structured directory tree
- Clean file content formatting
- Optional bundling (Frontend / Backend / Config)
- Designed for **LLM context windows**

### 🌙 Developer-friendly UX
- Dark / Light mode
- Progress tracking
- Reset & reprocess flow
- Clean, modern UI with Tailwind CSS

### ⚡ Zero-Server Architecture
- React + TypeScript + Vite
- No backend required
- Instant deployment (Vercel / Netlify)

---

## 🏗️ Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| File Access | Browser File API |
| Architecture | Fully client-side |
| Deployment | Vercel / Netlify |

---

## 📁 Project structure (simplified)

```text
src/
├── App.tsx              # Main application logic
├── main.tsx             # React entry point
├── components/          # UI components
│   ├── DirectoryPicker.tsx
│   ├── OutputViewer.tsx
│   └── SettingsModal.tsx
├── utils/               # Core logic
│   ├── fileProcessor.ts
│   ├── dependencyAnalyzer.ts
│   └── treeGenerator.ts
├── types.ts             # Shared TypeScript types
