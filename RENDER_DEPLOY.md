# 🚀 Deploying to Render

## ✅ yt-dlp Installation for Render

This guide explains how to deploy your YouTube Downloader to Render with `yt-dlp` properly installed.

---

## 🎯 Why yt-dlp?

`yt-dlp` is **required** for reliable YouTube downloads because:
- ✅ YouTube frequently changes their website structure
- ✅ `yt-dlp` is actively maintained and updated
- ✅ `@distube/ytdl-core` often breaks when YouTube changes their API
- ✅ `yt-dlp` is more reliable and compatible

---

## 📋 Method 1: Using render.yaml (Recommended)

### Step 1: Create render.yaml

A `render.yaml` file is already created in your project root with `yt-dlp` installation in the build command.

### Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click **"Apply"** to deploy

The `render.yaml` will automatically:
- ✅ Install npm dependencies
- ✅ Download and install `yt-dlp` binary
- ✅ Set up the Node.js service
- ✅ Configure environment variables

---

## 📋 Method 2: Manual Configuration

### Step 1: Create New Web Service

1. Go to [render.com](https://render.com) dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository and branch

### Step 2: Configure Build Settings

**Build Command:**
```bash
npm install && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp && sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp
```

**Start Command:**
```bash
npm start
```

**Environment:**
- `Node`: Select latest (18 or 20)
- `NODE_ENV`: `production`
- `PORT`: Render automatically sets this (use `process.env.PORT` in your code)

### Step 3: Advanced Settings

**Add Environment Variables:**
```
NODE_ENV=production
PORT=10000
```

**Note:** Render automatically sets `PORT` environment variable, so your server should use `process.env.PORT || 3000` (which it already does in `server.js`).

---

## 📋 Method 3: Using Build Script

### Step 1: Update Build Command

In Render dashboard → Your Service → Settings → Build Command:

```bash
npm install && bash install-ytdlp.sh
```

This uses the `install-ytdlp.sh` script that tries multiple installation methods.

### Step 2: Deploy

Render will automatically run the build command during deployment.

---

## 🔧 Alternative: Install via Python/pip (if available)

If your Render instance has Python available, you can use pip:

**Build Command:**
```bash
npm install && pip3 install --user yt-dlp
```

Then update `server.js` to check for `~/.local/bin/yt-dlp` as well.

---

## ✅ Verify Installation

After deployment, check if `yt-dlp` is installed:

1. Go to Render dashboard → Your Service → **"Shell"** tab
2. Run:
```bash
which yt-dlp
yt-dlp --version
```

If it shows the version, `yt-dlp` is installed correctly! ✅

---

## 🐛 Troubleshooting

### Error: "yt-dlp not found"

**Solution 1:** Update build command to include full path:
```bash
npm install && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
```

**Solution 2:** Add to PATH in start command:
```bash
export PATH=$PATH:/usr/local/bin && npm start
```

**Solution 3:** Use absolute path in server.js (not recommended, but works):
Modify `checkYtDlp()` function to check `/usr/local/bin/yt-dlp` directly.

### Error: "Permission denied"

**Solution:** Make sure the build command includes `chmod +x`:
```bash
chmod +x /tmp/yt-dlp && sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp
```

### Error: "curl: command not found"

**Solution:** Render instances should have `curl` by default. If not, try `wget`:
```bash
wget -O /tmp/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
```

---

## 📝 Render Configuration Summary

**Recommended Build Command:**
```bash
npm install && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp && sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```
NODE_ENV=production
```

**Auto-Deploy:** ✅ Enabled (deploys on every push to main branch)

---

## 🎯 Current Implementation

Your `server.js` already:
- ✅ Checks for `yt-dlp` first (line 282)
- ✅ Falls back to `youtube-dl` if `yt-dlp` not found (line 162)
- ✅ Falls back to `@distube/ytdl-core` if neither is found (line 290)
- ✅ Shows helpful error messages if all fail (line 302)

**What you need to do:**
- ✅ Just install `yt-dlp` on Render using one of the methods above
- ✅ The server will automatically use it!

---

## 🚀 Quick Deploy Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Deploy on Render:**
   - Method 1: Use `render.yaml` (auto-detected)
   - Method 2: Manual configuration with build command above
   - Method 3: Use `install-ytdlp.sh` script

3. **Verify:**
   - Check Render logs for "yt-dlp installed successfully"
   - Test a YouTube download
   - Check Render shell: `which yt-dlp`

---

## ✅ Success Indicators

After successful deployment, you should see:
- ✅ Build completes without errors
- ✅ Server starts successfully
- ✅ Logs show: "YouTube Downloader server running on..."
- ✅ YouTube downloads work (no "YouTube has changed their website structure" error)

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [yt-dlp Installation Guide](https://github.com/yt-dlp/yt-dlp#installation)

---

## 🎉 You're Ready!

Once `yt-dlp` is installed on Render, your YouTube Downloader will work reliably! 🚀

Good luck with your deployment! 🎉

