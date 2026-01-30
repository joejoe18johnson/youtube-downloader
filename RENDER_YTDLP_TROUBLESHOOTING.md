# 🔧 Render yt-dlp Troubleshooting Guide

## 🚨 Error: "YouTube has changed their website structure. yt-dlp is not available."

This error means the server cannot find yt-dlp at runtime, even though the build script should install it.

---

## ✅ What Should Happen

### During Build (build.sh):

1. **Build script runs:** `bash build.sh`
2. **Downloads yt-dlp** from GitHub to `bin/yt-dlp`
3. **Makes it executable:** `chmod +x bin/yt-dlp`
4. **Verifies installation:** Checks file exists and is executable

### Expected Build Logs:

```
🔨 Starting build process...
📦 Installing npm dependencies...
✅ Package installation completed successfully

📁 Creating bin directory...
Created bin directory at: /opt/render/project/src/bin

⬇️  Downloading yt-dlp from GitHub...
Trying curl...
✅ yt-dlp downloaded successfully via curl

🔧 Making yt-dlp executable...
✅ Made yt-dlp executable

✅ Verifying yt-dlp installation...
✅ yt-dlp file exists
File location: /opt/render/project/src/bin/yt-dlp
File size: X.XM
✅ yt-dlp is executable
✅ yt-dlp version: 2024.x.x

✅✅✅ yt-dlp INSTALLATION SUCCESSFUL ✅✅✅
File location: /opt/render/project/src/bin/yt-dlp
Server should find it at: process.cwd()/bin/yt-dlp
```

### At Server Startup:

The server checks for yt-dlp in this order:
1. `process.cwd()/bin/yt-dlp` ✅ **This is where build.sh installs it**
2. `__dirname/bin/yt-dlp`
3. `/usr/local/bin/yt-dlp`
4. `/usr/bin/yt-dlp`
5. `~/.local/bin/yt-dlp`
6. PATH environment variable

### Expected Runtime Logs:

```
YouTube Downloader server running on...
Node version: v20.x.x
Checking dependencies...
✅ yt-dlp found at: /opt/render/project/src/bin/yt-dlp (version: 2024.x.x)
✅ yt-dlp is available
```

---

## ❌ Common Issues & Fixes

### Issue 1: Build Script Fails to Download

**Symptoms:**
- Build logs show: "❌ Failed to download yt-dlp using both curl and wget"
- No yt-dlp file in build output

**Possible Causes:**
1. Network issues during build
2. GitHub releases URL changed
3. curl/wget not available on Render

**Fix:**
1. Check Render build logs for download errors
2. Verify network connectivity during build
3. Check if GitHub releases URL is accessible
4. If persistent, add retry logic to build script

---

### Issue 2: File Downloaded But Not Executable

**Symptoms:**
- Build logs show: "✅ yt-dlp downloaded successfully"
- But also: "⚠️  yt-dlp file exists but is not executable"
- Runtime: "yt-dlp version check failed"

**Fix:**
The build script should handle this, but if it persists:
1. Check build logs for chmod errors
2. Verify file permissions in build output
3. May need to adjust build script permissions

---

### Issue 3: File Not Found at Runtime

**Symptoms:**
- Build logs show: "✅✅✅ yt-dlp INSTALLATION SUCCESSFUL"
- But runtime logs show: "⚠️  yt-dlp not found"

**Possible Causes:**
1. `process.cwd()` is different at runtime vs build
2. File is in a different location
3. File was removed between build and runtime

**Fix:**
1. Check runtime logs for "Current working directory:" and "__dirname:"
2. Verify the file path matches build log path
3. Check if Render preserves files between build and runtime
4. Look for "yt-dlp found at:" messages in runtime logs

---

### Issue 4: Node Version Incompatibility

**Symptoms:**
- Build fails with: "engine node incompatible"
- Or: "Expected version >=20.18.1. Got 18.20.8"

**Fix:**
1. Update Node version to 20 in Render Dashboard:
   - Settings → Node Version → Select "20" or "Latest"
   - Save and redeploy
2. Or ensure `.nvmrc` has `20` and Render auto-detects it
3. Verify `package.json` has `engines: { node: ">=20.18.1" }`

See `RENDER_NODE20_SETUP.md` for detailed instructions.

---

## 🔍 Debugging Steps

### Step 1: Check Build Logs

Look for:
- ✅ "yt-dlp downloaded successfully"
- ✅ "yt-dlp is executable"
- ✅ "yt-dlp INSTALLATION SUCCESSFUL"
- ❌ Any error messages during download

### Step 2: Check Runtime Logs

Look for:
- ✅ "yt-dlp found at: [path]"
- ✅ "yt-dlp is available"
- ❌ "yt-dlp not found"
- "Current working directory:" (should match build path)
- "__dirname:" (should show server.js location)

### Step 3: Verify File Paths

**Build script installs to:**
```
/opt/render/project/src/bin/yt-dlp
```

**Server checks:**
```
process.cwd()/bin/yt-dlp  (should be /opt/render/project/src/bin/yt-dlp)
```

If `process.cwd()` is different at runtime, that's the issue!

---

## 🛠️ Manual Fix (If Build Script Fails)

If the build script consistently fails, you can manually add yt-dlp installation to render.yaml:

```yaml
services:
  - type: web
    name: youtube-downloader
    env: node
    buildCommand: |
      bash build.sh
      # Fallback: Try to install yt-dlp manually if build script failed
      if [ ! -f bin/yt-dlp ]; then
        echo "Build script failed, trying manual install..."
        mkdir -p bin
        curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp || wget -O bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp
        chmod +x bin/yt-dlp || true
      fi
    startCommand: npm start
```

---

## 📋 Checklist

Before reporting an issue, check:

- [ ] Node version is 20 (check dashboard or build logs)
- [ ] Build logs show yt-dlp downloaded successfully
- [ ] Build logs show yt-dlp is executable
- [ ] Runtime logs show "Current working directory:" matches build path
- [ ] Runtime logs show server is checking `process.cwd()/bin/yt-dlp`
- [ ] File actually exists at the expected path (check build output)

---

## ✅ Expected Final State

**Build Logs:**
```
✅✅✅ yt-dlp INSTALLATION SUCCESSFUL ✅✅✅
File location: /opt/render/project/src/bin/yt-dlp
Server should find it at: process.cwd()/bin/yt-dlp
```

**Runtime Logs:**
```
✅ yt-dlp found at: /opt/render/project/src/bin/yt-dlp (version: 2024.x.x)
✅ yt-dlp is available
```

**Downloads:**
- Should work with yt-dlp (no "YouTube structure change" errors)
- Fast and reliable downloads
- Works for both video and audio formats

---

## 🚀 Quick Fix Summary

1. **Check Node version** → Must be 20 (update in dashboard if needed)
2. **Check build logs** → Should show "yt-dlp INSTALLATION SUCCESSFUL"
3. **Check runtime logs** → Should show "yt-dlp found at: [path]"
4. **Verify paths match** → Build path should match runtime path
5. **If still failing** → Check network issues or file permissions

---

Good luck! 🎉


