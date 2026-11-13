# PropagandaDestroyer3000

Chrome extension (Manifest V3) that hides propaganda posts on X/Twitter behind a blur with a "show anyways" button.

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Structure

- `src/frontend/`: UI (popup, in-page overlay)
- `src/backend/`: functionality (feed observer, detection, platform adapters)
- `src/shared/`: shared namespace and constants

See [.agents/.AGENTS.md](.agents/.AGENTS.md) for architecture rules.
