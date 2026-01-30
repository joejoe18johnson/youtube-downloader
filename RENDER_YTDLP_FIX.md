# 🔧 Fix: yt-dlp Not Installed on Render

## Problem
You're getting the "YouTube has changed their website structure" error on Render because `yt-dlp` is not installed during the Render build process.

## ✅ Solution: Update Render Build Command

### Option 1: Update via Render Dashboard (Quickest)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your service: `youtube-downloader`
3. Click **"Settings"** tab
4. Scroll to **"Build Command"**
5. Replace the current build command with:

```bash
npm install && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /opt/render/project/src/yt-dlp && chmod +x /opt/render/project/src/yt-dlp && export PATH=$PATH:/opt/render/project/src
```

6. Click **"Save Changes"**
7. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Option 2: Use render.yaml (Automatic)

Your `render.yaml` has the installation command, but Render might not be using it if you deployed manually. To use `render.yaml`:

1. Go to Render Dashboard
2. Create **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"** to create/update the service

### Option 3: Simplified Build Command (If Option 1 fails)

If the above doesn't work due to sudo restrictions, use this alternative:

```bash
npm install && mkdir -p bin && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp && chmod +x bin/yt-dlp
```

Then update your **Start Command** to:
```bash
export PATH=$PATH:$PWD/bin && npm start
```

---

## 🔍 Verify Installation

After deploying, check Render logs:

1. Go to **Logs** tab in Render Dashboard
2. Look for build logs showing:
   ```
   Downloading yt-dlp...
   yt-dlp installed successfully
   ```
3. Look for runtime logs showing:
   ```
   ✅ yt-dlp is available (version: 2025.12.08)
   ✅ yt-dlp is available - will use it for downloads (recommended)
   ```

If you see:
```
⚠️  yt-dlp not found - will fallback to @distube/ytdl-core
```

Then yt-dlp installation failed. Try Option 3 above.

---

## 📝 Current render.yaml Configuration

Your `render.yaml` file should have:

```yaml
services:
  - type: web
    name: youtube-downloader
    env: node
    buildCommand: |
      npm install &&
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp &&
      chmod +x /tmp/yt-dlp &&
      sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

**Issue:** The `sudo mv` command may fail on Render due to permission restrictions.

**Fixed version:**

```yaml
services:
  - type: web
    name: youtube-downloader
    env: node
    buildCommand: |
      npm install &&
      mkdir -p bin &&
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp &&
      chmod +x bin/yt-dlp
    startCommand: export PATH=$PATH:$PWD/bin && npm start
    envVars:
      - key: NODE_ENV
        value: production
```

---

## 🚀 Quick Fix Steps

### Step 1: Update render.yaml locally

Replace your `render.yaml` with the fixed version above (without sudo).

### Step 2: Commit and push

```bash
cd "/Users/admin/Documents/web_Youtube_Downloader copy"
git add render.yaml
git commit -m "Fix: Update Render build command to install yt-dlp without sudo"
git push origin main
```

### Step 3: Redeploy on Render

**If using Blueprint:**
- Render will auto-deploy when you push

**If using manual deployment:**
- Go to Render Dashboard → Your service
- Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🐛 Troubleshooting

### Check Render Build Logs

1. Go to Render Dashboard → Your service → **"Logs"**
2. Filter by **"Build Logs"**
3. Look for:
   ```
   npm install
   ...downloading yt-dlp...
   chmod +x bin/yt-dlp
   ```

### Check Runtime Logs

After deployment, check for:
```
✅ yt-dlp is available (version: 2025.12.08)
```

### If yt-dlp still not found:

**Option A: Add to PATH in server.js**

Add this at the top of `server.js`:
```javascript
// Add local bin to PATH for Render
process.env.PATH = `${process.cwd()}/bin:${process.env.PATH}`;
```

**Option B: Use absolute path**

In `server.js`, modify the `checkYtDlp` function to check:
```javascript
const ytdlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');
if (fs.existsSync(ytdlpPath)) {
    console.log('✅ yt-dlp found at:', ytdlpPath);
    return true;
}
```

---

## ✅ Expected Result

After applying the fix:

**Build logs:**
```
npm install
...
Downloading yt-dlp...
✅ yt-dlp installed to bin/yt-dlp
```

**Runtime logs:**
```
YouTube Downloader server running on...
Checking dependencies...
✅ yt-dlp is available (version: 2025.12.08)
✅ yt-dlp is available - will use it for downloads (recommended)
Server ready to accept requests!
```

**When downloading:**
```
Using yt-dlp for download (more reliable)
Downloading: 45.2%
Download complete!
```

---

## 📚 Alternative: Use Python/pip (if available)

If Render has Python available:

**Build Command:**
```bash
npm install && pip3 install --user yt-dlp
```

**Start Command:**
```bash
export PATH=$PATH:$HOME/.local/bin && npm start
```

---

## 🎯 Recommended: Fixed render.yaml

Update your `render.yaml` to:

```yaml
services:
  - type: web
    name: youtube-downloader
    env: node
    buildCommand: npm install && mkdir -p bin && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp && chmod +x bin/yt-dlp
    startCommand: export PATH=$PATH:$PWD/bin && npm start
    envVars:
      - key: NODE_ENV
        value: production
```

Commit, push, and redeploy!

---

🎉 **Once yt-dlp is installed on Render, the error will be fixed!**


