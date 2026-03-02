# Link Tagging App

A simple Next.js app to save links and organize them with tags. Paste a URL, add one or more tags (comma or space separated), and browse your saved links by tag.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Add links**: Paste a URL and add multiple tags (e.g. `work, reading, inspiration`).
- **Browse by tag**: Sidebar lists all tags; click a tag to see only links with that tag.
- **All links**: Click "All links" to see every saved link, newest first.
- **Remove**: Hover a link and click × to delete it.

Data is stored in your browser’s localStorage, so it persists across sessions on the same device.

## Build for production

```bash
npm run build
npm start
```
