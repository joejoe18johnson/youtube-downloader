# 🚀 Start Your Server

## ✅ Quick Start

**yt-dlp is installed!** (version 2025.12.08)

### Step 1: Start the Server

Run this command:

```bash
cd "/Users/admin/Documents/web_Youtube_Downloader copy"
npm start
```

**OR use the restart script:**

```bash
cd "/Users/admin/Documents/web_Youtube_Downloader copy"
./restart-server.sh
```

### Step 2: Check the Startup Logs

When the server starts, you should see:

```
YouTube Downloader server running on http://localhost:3000
Registered routes:
  POST /api/download
  ...

Checking dependencies...
✅ yt-dlp found at: /usr/local/bin/yt-dlp (version: 2025.12.08)
✅ yt-dlp is available - will use it for downloads (recommended)
   Location: /usr/local/bin/yt-dlp
✅ FFmpeg is available - MP3 conversion and video merging enabled

Server ready to accept requests!
```

**✅ If you see this:** The server will use `yt-dlp` and downloads should work!

**⚠️ If you see:**
```
⚠️  yt-dlp not found - will fallback to @distube/ytdl-core
```

Then there's an issue with detection. Check the troubleshooting section below.

### Step 3: Test a Download

1. Open your browser: `http://localhost:3000`
2. Try downloading a YouTube video
3. Check the server logs - you should see:
   ```
   Using yt-dlp for download (more reliable)
   Using yt-dlp at: /usr/local/bin/yt-dlp
   Downloading: 45.2%
   Download complete!
   ```

---

## 🔍 Troubleshooting

### If yt-dlp is not detected:

**Check if yt-dlp is in PATH:**
```bash
which yt-dlp
echo $PATH
```

**Test yt-dlp directly:**
```bash
yt-dlp --version
/usr/local/bin/yt-dlp --version
```

**Verify Node.js can find it:**
```bash
node -e "const {exec} = require('child_process'); exec('which yt-dlp', (e,o) => console.log('Found:', o.trim()))"
```

**If still not found, add to PATH:**
```bash
export PATH=$PATH:/usr/local/bin
npm start
```

### If you still get the error after restart:

1. **Check server logs** - Look for where it says "yt-dlp not found"
2. **Verify the code is updated** - Make sure you're using the latest `server.js` from GitHub
3. **Check for multiple servers** - Make sure only one server is running:
   ```bash
   lsof -ti:3000
   pkill -f "node.*server.js"
   npm start
   ```

---

## 📝 Current Status

- ✅ yt-dlp is installed: `/usr/local/bin/yt-dlp` (version 2025.12.08)
- ✅ Server code is updated with improved detection
- ⚠️  Server needs to be started to use the new code

---

## 🎯 Next Steps

1. **Start the server:** `npm start`
2. **Verify yt-dlp detection** in the startup logs
3. **Test a download** - The error should be gone!

---

## ✅ Expected Result

After starting the server with the updated code:
- ✅ Server detects yt-dlp at startup
- ✅ Downloads use yt-dlp (not ytdl-core)
- ✅ No more "YouTube structure change" errors
- ✅ Downloads work reliably

---

🎉 **Just start your server and the error should be fixed!**

