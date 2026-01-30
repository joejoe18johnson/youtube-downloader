# Where to host this app

This app needs a **Node.js server** that can run for a long time and use **ffmpeg** and **yt-dlp** (installed via `build.sh`). Downloads can take 30+ seconds.

## Best option: **Render**

Your project already has **Render** set up:

- **`render.yaml`** – defines the web service
- **`build.sh`** – installs yt-dlp and runs at deploy time
- **`server.js`** – Express app with `/api/download`, progress, etc.

**Steps:**

1. Push the repo to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service.
3. Connect the repo and Render will use `render.yaml` (build: `build.sh`, start: `npm start`).
4. Deploy. Your app will run at `https://<your-service>.onrender.com`.

Render gives you a real Node server, no request timeout for downloads, and you can install system binaries (yt-dlp, ffmpeg) in the build.

---

## Netlify (frontend only)

**`netlify.toml`** is set up for a **static** deploy:

- Builds Tailwind CSS (`npm run build:css`).
- Publishes `index.html`, `app.js`, `styles.css`, and assets.
- SPA redirect so unknown paths serve `index.html`.

**Limitation:** Netlify does **not** run your Express server. It only serves static files and serverless functions (with ~10–26s time limits). So **downloads will not work** if you deploy only to Netlify.

To use Netlify for this app you would need to:

- Deploy the **backend** on Render (or another Node host).
- Deploy the **frontend** on Netlify.
- Point the frontend at the backend URL (e.g. via an env var and `getApiBase()` in `app.js`).

For a single deployment, **Render is simpler and recommended.**

---

## Other options

- **Railway** – Node support, long-running processes, good for this app.
- **Fly.io** – Similar; you’d add ffmpeg/yt-dlp in a Dockerfile or image.
- **VPS** (DigitalOcean, Linode, etc.) – Full control; install Node, ffmpeg, yt-dlp and run `npm start`.

---

**Summary:** Use **Render** for the full app (backend + frontend). Use **Netlify** only if you want the UI on Netlify and the API on another host; otherwise stick with Render.
