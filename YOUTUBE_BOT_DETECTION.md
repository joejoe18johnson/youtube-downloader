# 🔧 YouTube Bot Detection - Troubleshooting Guide

## Problem
YouTube is detecting yt-dlp as a bot and blocking downloads with errors like:
```
ERROR: [youtube] <video_id>: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies
```

## ✅ What Was Fixed

### 1. Added Anti-Bot Detection Options

The server now includes these options to make yt-dlp look more like a browser:

- **Realistic User-Agent**: Chrome 120.0.0.0 on Windows
- **Browser Headers**: Accept, Accept-Language, DNT, Connection, etc.
- **Referer Header**: Points to youtube.com
- **Player Client**: Uses `android,web` players (less bot detection)
- **SSL Options**: `--no-check-certificate` and `--prefer-insecure` for compatibility

### 2. Better Error Messages

The server now provides user-friendly error messages for:
- Bot detection errors
- Private videos
- Age-restricted videos
- Unavailable/deleted videos

---

## 🚀 Current Solution

The fix is deployed! The server will now:
1. Use browser-like headers and user-agent
2. Use mobile/web player clients (less detection)
3. Provide clear error messages if blocking persists

---

## ⚠️ If Still Blocked

If YouTube still blocks downloads after this fix, you have these options:

### Option 1: Wait and Retry
Sometimes YouTube's bot detection is temporary. Wait a few hours and try again.

### Option 2: Update yt-dlp
YouTube frequently changes their detection methods. Update yt-dlp to the latest version:

```bash
# In build.sh or manually on server
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp
chmod +x bin/yt-dlp
```

### Option 3: Use Cookies (Advanced)

If bot detection persists, you can use cookies from a logged-in browser:

1. **Export cookies from browser:**
   - Install browser extension like "Get cookies.txt" or "Cookies.txt"
   - Export cookies from youtube.com

2. **Upload cookies to server:**
   - Place `cookies.txt` in the project root
   - Update server.js to include `--cookies cookies.txt` in yt-dlp args

3. **Or use cookies from browser directly:**
   - Add `--cookies-from-browser chrome` (or firefox/edge/safari)
   - This requires browser cookies to be accessible on the server (not possible on Render)

### Option 4: Fallback to ytdl-core

If yt-dlp is consistently blocked, the server will automatically fallback to `@distube/ytdl-core`, though it may also be blocked.

---

## 🔍 Monitoring

Check server logs for:
- `Using yt-dlp at: [path]` - Confirms yt-dlp is being used
- `ERROR: [youtube]` - Bot detection errors
- `yt-dlp error:` - Detailed error messages

---

## 📋 Known Limitations

1. **Server Environment**: Render/VPS servers are often detected as bots by YouTube
2. **IP Reputation**: Shared IPs (like Render) may have worse reputation
3. **Rate Limiting**: Too many requests from same IP can trigger blocks
4. **YouTube Updates**: YouTube frequently updates their bot detection

---

## ✅ Expected Behavior

**Success:**
```
Using yt-dlp at: /opt/render/project/src/bin/yt-dlp
[download] 45.2% of 125.3MiB at 2.1MiB/s ETA 00:00:35
Download complete!
```

**Bot Detection (with fix):**
```
YouTube is blocking automated access. This video may require authentication or may be temporarily unavailable. Please try again later or use a different video.
```

---

## 🛠️ Future Improvements

If bot detection becomes a persistent issue:

1. **Rotate User-Agents**: Randomize user-agent strings
2. **Add Delays**: Add random delays between requests
3. **Use Proxies**: Route requests through different IPs
4. **Cookie Rotation**: Use multiple cookie files
5. **Update yt-dlp More Frequently**: Always use latest version

---

**The fix is deployed! Try downloading again.** 🚀

If you still see bot detection errors, it means YouTube has updated their detection methods and we may need to add cookies or update yt-dlp to the latest version.


