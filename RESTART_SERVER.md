# 🔄 Restart Server Instructions

## Current Status
- ✅ `yt-dlp` is installed (version 2025.12.08)
- ✅ Server code has been updated with improved yt-dlp detection
- ⚠️  Old server is still running (needs restart)

## 🚀 Quick Fix: Restart Your Server

### Step 1: Stop the Current Server

**Option A: Find and stop the process manually**
```bash
# Find the server process
lsof -ti:3000

# Stop it (replace PID with actual process ID)
kill -9 29211

# Or stop all Node processes (be careful!)
pkill -f "node.*server.js"
```

**Option B: Use Ctrl+C in the terminal**
- Go to the terminal window where the server is running
- Press `Ctrl+C` to stop the server

### Step 2: Start the Server Again

```bash
cd "/Users/admin/Documents/web_Youtube_Downloader copy"
npm start
```

### Step 3: Verify yt-dlp Detection

When the server starts, you should see output like:

```
YouTube Downloader server running on http://localhost:3000
Registered routes:
  POST /api/download
  POST /api/test-post
  GET /api/test
  GET /api/progress/:sessionId
  GET /api/mobile-download/:sessionId

Checking dependencies...
✅ yt-dlp is available (version: 2025.12.08)
✅ yt-dlp is available - will use it for downloads (recommended)
✅ FFmpeg is available - MP3 conversion and video merging enabled

Server ready to accept requests!
```

**If you see:**
```
⚠️  yt-dlp not found - will fallback to @distube/ytdl-core
```

Then there's a PATH issue. See "Troubleshooting" below.

## 🔍 Troubleshooting

### If yt-dlp still not detected:

**Check PATH:**
```bash
echo $PATH
which yt-dlp
```

**Test yt-dlp directly:**
```bash
yt-dlp --version
/usr/local/bin/yt-dlp --version
```

**Verify Node.js can find yt-dlp:**
```bash
node -e "const {exec} = require('child_process'); exec('which yt-dlp', (e,o) => console.log(o.trim()))"
```

### If downloads still fail after restart:

1. **Check server logs** - Look for error messages when downloading
2. **Test yt-dlp manually:**
   ```bash
   yt-dlp "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --list-formats
   ```
3. **Update yt-dlp:**
   ```bash
   brew upgrade yt-dlp
   ```
4. **Check for network issues** - YouTube might be blocking requests

## 📝 Quick Restart Script

You can also use this one-liner:

```bash
cd "/Users/admin/Documents/web_Youtube_Downloader copy" && pkill -f "node.*server.js" && sleep 1 && npm start
```

Or create a restart script:

```bash
#!/bin/bash
# restart-server.sh
cd "/Users/admin/Documents/web_Youtube_Downloader copy"
pkill -f "node.*server.js"
sleep 1
npm start
```

Make it executable:
```bash
chmod +x restart-server.sh
./restart-server.sh
```

## ✅ After Restart

Once the server restarts with the updated code:
- ✅ Downloads will use `yt-dlp` (not `ytdl-core`)
- ✅ No more "YouTube structure change" errors
- ✅ More reliable downloads
- ✅ Better error messages in logs

---

## 🎯 Expected Behavior After Restart

**When you try to download:**
1. Server logs: "Using yt-dlp for download (more reliable)"
2. Download proceeds normally
3. Progress updates in real-time
4. No error messages about YouTube structure changes

**If you still see errors:**
- Check server logs for detailed error messages
- Verify yt-dlp is working: `yt-dlp --version`
- Try a different YouTube video
- Check network connection

---

🎉 **Just restart your server and the error should be fixed!**


