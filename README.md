<table width="100%">
  <tr>
    <td align="center" width="120">
      <img src="apps/desktop/app-icon.png" alt="Logo" width="100" style="border-radius: 20%;"/>
    </td>
    <td align="right">
      <h1>youtube.pub</h1>
      <h3 style="margin-top: -10px;">Everything you need to make great YouTube thumbnails</h3>
    </td>
  </tr>
</table>

Extract frames from videos, edit with layers, remove backgrounds with AI, generate images with Gemini, and export in multiple formats.

[![Windows](https://img.shields.io/badge/Windows-Download-blue?logo=windows)](https://github.com/jiaweing/youtube.pub/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-Download-white?logo=apple)](https://github.com/jiaweing/youtube.pub/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-Download-orange?logo=linux)](https://github.com/jiaweing/youtube.pub/releases/latest)

## Features

### Gallery
- Thumbnail grid view (3x3, 4x4, 5x5) or list view
- Search and filter thumbnails
- Sort by name, date added, or last edited
- Drag selection for bulk operations
- Batch duplicate, delete, and background removal

### Video Frame Extraction
- Scrub through video timeline
- Extract any frame as an image
- Supports MP4, WebM, and other common formats

### Image Editor
- Layer-based editing with drag, resize, and rotate
- Add images from gallery as overlays
- Adjustable canvas size
- Undo/redo support
- Project auto-save with unsaved changes detection

### AI Features
- Background removal powered by imgly
- Gemini image generation (Bring Your Own Key)
- Generate multiple image variations at once
- Save as new layer or to gallery

### Trash
- 30-day retention for deleted items
- Restore individual or bulk items
- Permanent deletion option

### Export
- PNG, JPEG, WebP formats
- Custom resolution and quality settings
- Preview before export

## Tech Stack

- [Tauri v2](https://v2.tauri.app)
- [React 19](https://react.dev)
- [Vite](https://vitejs.dev)
- [TailwindCSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [SQLite](https://www.sqlite.org)
- [Stronghold](https://plugins.tauri.app/plugins/stronghold)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://rustup.rs/) - Required for Tauri

### Installation

```bash
cd apps/desktop
bun install
```

### Development

```bash
bun run desktop:dev
```

### Build

```bash
bun run desktop:build
```

Installers are generated in `src-tauri/target/release/bundle/`.

## Project Structure

```
apps/desktop/
├── src/
│   ├── components/
│   │   ├── gallery/         # Shared gallery components
│   │   ├── editor/          # Editor sub-components
│   │   ├── gemini/          # AI generation components
│   │   ├── trash/           # Trash page components
│   │   ├── Gallery.tsx      # Main gallery view
│   │   ├── ImageEditor.tsx  # Layer-based editor
│   │   ├── GeminiImagePage.tsx # AI image generation
│   │   └── TrashPage.tsx    # Trash management
│   ├── stores/              # Zustand state stores
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and helpers
│   └── index.css            # TailwindCSS theme
├── src-tauri/
│   ├── src/lib.rs           # Tauri plugins setup
│   └── tauri.conf.json      # App configuration
└── package.json
```

## Data Storage

Thumbnails and metadata are stored in the OS-specific app data directory:

| OS      | Path                                                    |
|---------|---------------------------------------------------------|
| Windows | `C:\Users\<user>\AppData\Roaming\pub.youtube.desktop`   |
| macOS   | `~/Library/Application Support/pub.youtube.desktop`    |
| Linux   | `~/.local/share/pub.youtube.desktop`                    |