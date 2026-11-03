# Neutrino

**Context-Aware Research Intelligence Platform**

*"Superhuman Research Intelligence for Academic Workflows"*

## Overview

Neutrino is a desktop application designed to eliminate information overload in academic research. Instead of passive document storage like traditional PKM tools, Neutrino actively understands and enhances research workflows through real-time cognitive assistance with context-aware AI.

## Key Features

### 🧠 Context-Aware AI
- Understands what you're reading and where you are in documents
- Provides intelligent suggestions based on current context
- Tracks research sessions and maintains mental state

### 📝 Smart Knowledge Capture
- Capture information from any application (Copy/Paste intervention)
- Automatically categorize and link to current research
- Voice notes and image processing capabilities

### 🔗 Interactive Reference System
- Smart linking system with split view interface
- Bi-directional links and instant previews
- Context-aware connection suggestions

### 🔍 Built-in Contextual Search
- In-app search with context awareness
- Results ranked by research session relevance
- Full-text search with FTS5

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Rust, Tauri 2.0 |
| Database | SQLite with FTS5 (Full-Text Search) |
| AI | Google Gemini API |
| Editor | CodeMirror 6 |
| PDF | PDF.js, react-pdf |

## System Requirements

- Node.js 18+
- Rust (install via https://rustup.rs/)
- Visual Studio Build Tools (Windows) or Xcode (macOS)

## Installation & Development

```bash
# Install dependencies
npm install

# Start development server (desktop app)
npm run tauri:dev

# Build for production
npm run tauri:build
```

### API Configuration (Optional)

To enable AI features, create `src-tauri/.env`:
```
GEMINI_API_KEY=your_api_key_here
```
Get a free API key at: https://aistudio.google.com/app/apikey

The `.env` file is only read in development. For a built/installed app, set `GEMINI_API_KEY` as a system environment variable.

See [INSTALLATION_GUIDE.txt](INSTALLATION_GUIDE.txt) for detailed setup and troubleshooting.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+N` | Show/hide the main window (global) |
| `Ctrl+Shift+F` | Show/hide the floating note (global) |

## Project Structure

```
neutrino/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   ├── services/           # Business logic
│   └── hooks/              # Custom React hooks
├── src-tauri/              # Rust backend
│   ├── src/                # Rust source code
│   └── migrations/         # Database migrations
├── INSTALLATION_GUIDE.txt  # Detailed setup guide
└── public/                 # Static assets
```

## Target Users

- PhD students and Postdocs
- STEM researchers
- Professionals requiring deep technical learning
- Anyone working with large document collections

## License

This project is developed for educational purposes.
