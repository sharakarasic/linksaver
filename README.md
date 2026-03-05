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

## Auth sanity test (via curl)

Use these steps to quickly verify auth and storage:

1. **Register a new random user**

```bash
API="http://localhost:3000"
UNAME="testuser_$RANDOM"

curl -i "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$UNAME\",\"password\":\"testpass\"}"
```

- Expect `HTTP/1.1 201` and a JSON body with the user.
- The response headers should include `Set-Cookie: session=...`.
- `data/users.json` should now contain an entry with `"username": "$UNAME"` in **lowercase**.

2. **Login with the same user**

```bash
curl -i "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$UNAME\",\"password\":\"testpass\"}"
```

- Expect `HTTP/1.1 200` and a JSON user.
- Again, you should see `Set-Cookie: session=...` in the headers.

3. **Inspect stored users (optional)**

```bash
cat data/users.json
```

You should see all users as a JSON array, with each `username` stored in lowercase and new users appended at the end.

