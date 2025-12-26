# youtube.pub

A minimal desktop application for creating YouTube thumbnails. Extract frames from videos, edit with layers and text, remove backgrounds with AI, and export in multiple formats.

## Features

- **Frame Extraction** - Scrub through video timeline and extract any frame as an image
- **Gallery View** - Organize thumbnails in grid (3x3, 4x4, 5x5) or list view
- **Image Editor** - Layer-based editing with text overlays
- **Background Removal** - AI-powered background removal using imgly
- **Export Options** - PNG, JPEG, WebP with custom resolution and quality settings
- **Persistent Storage** - Thumbnails saved locally in OS app data folder

## Tech Stack

- **Tauri v2** - Rust-based desktop framework
- **React 19** - UI framework
- **Vite** - Build tool
- **TailwindCSS v4** - Styling
- **shadcn/ui** - Component library (base-lyra style)
- **Zustand** - State management
- **SQLite** - Metadata storage (planned)

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
│   │   ├── Gallery.tsx        # Thumbnail grid with actions
│   │   ├── VideoExtractor.tsx # Frame extraction modal
│   │   ├── ImageEditor.tsx    # Layer-based editor
│   │   └── ExportDialog.tsx   # Export settings
│   ├── stores/
│   │   └── useGalleryStore.ts # Thumbnail state
│   └── index.css              # TailwindCSS theme
├── src-tauri/
│   ├── src/lib.rs             # Tauri plugins setup
│   └── tauri.conf.json        # App configuration
└── package.json
```

## Data Storage

Thumbnails and metadata are stored in the OS-specific app data directory:

| OS      | Path                                                    |
|---------|---------------------------------------------------------|
| Windows | `C:\Users\<user>\AppData\Roaming\pub.youtube.desktop`   |
| macOS   | `~/Library/Application Support/pub.youtube.desktop`    |
| Linux   | `~/.local/share/pub.youtube.desktop`                    |

## License

MIT
