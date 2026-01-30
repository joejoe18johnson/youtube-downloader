# 🚀 Render Node.js 20 Setup Guide

## ⚠️ Important: Manual Node Version Update Required

Render might still use Node 18 even with `.nvmrc` and `engines` field. You may need to **manually update it in the Render dashboard**.

---

## 🔧 Fix: Update Node Version in Render Dashboard

### Step 1: Go to Render Dashboard

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Select your `youtube-downloader` service

### Step 2: Update Node Version

**Option A: Via Settings Tab (Recommended)**
1. Click **"Settings"** tab
2. Scroll to **"Environment"** or **"Build & Deploy"** section
3. Find **"Node Version"** dropdown
4. Select **"20"** or **"Latest"** or **"20.x"**
5. Click **"Save Changes"**

**Option B: Via Environment Variables**
1. Click **"Environment"** tab
2. Add new environment variable:
   - **Key:** `NODE_VERSION`
   - **Value:** `20`
3. Click **"Save Changes"**

### Step 3: Redeploy

1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for build to complete
3. Check logs to verify Node 20 is being used

---

## ✅ Verify Node Version

After redeploying, check build logs. You should see:

```
Node version: v20.x.x  ✅ (instead of v18.20.8)
```

If you still see `v18.20.8`, the Node version wasn't updated in the dashboard.

---

## 📝 Alternative: Use render.yaml Blueprint (Automatic)

If you're using **Render Blueprint** (deploying via render.yaml):

1. **Recreate the service as a Blueprint:**
   - Delete the existing service
   - Create new service → **"Blueprint"**
   - Connect your GitHub repository
   - Render will auto-detect `.nvmrc` and use Node 20

2. **Or add explicit Node version to render.yaml:**
   ```yaml
   services:
     - type: web
       name: youtube-downloader
       env: node
       buildCommand: nvm use 20 && bash build.sh
       startCommand: npm start
   ```

---

## 🎯 Quick Fix: Update in Dashboard

**Fastest way to fix:**

1. **Render Dashboard** → Your service → **Settings**
2. **Node Version:** Change from `18` to `20` or `Latest`
3. **Save** → **Manual Deploy**

That's it! ✅

---

## ✅ Expected Result

After updating Node version in dashboard:

**Build logs:**
```
Node version: v20.18.1 (or latest 20.x)
NPM version: 10.x.x
📦 Installing npm dependencies...
✅ npm install completed successfully
(No engine incompatibility errors!)
```

**Runtime logs:**
```
YouTube Downloader server running on...
Node version: v20.x.x ✅
Checking dependencies...
✅ yt-dlp is available...
```

---

## 🐛 If Still Failing

If the build still fails after updating to Node 20:

1. **Check build logs** - Look for the exact error
2. **Verify Node version** - Make sure it shows v20.x.x
3. **Check yarn/npm** - Render might be using yarn instead of npm
4. **Try deleting and recreating the service** - Sometimes Render caches Node version

---

## 📋 Files Updated

- ✅ `.nvmrc` - Updated to `20`
- ✅ `package.json` - Added `engines: { node: ">=20.18.1" }`
- ✅ `package.json` - Updated `fluent-ffmpeg` to `^2.1.3`
- ✅ `build.sh` - Added Node version check and nvm support

---

## 🎉 Next Steps

1. **Update Node version in Render Dashboard** (Settings → Node Version → 20)
2. **Save and redeploy**
3. **Check build logs** - Should show Node 20
4. **Verify build succeeds** - No more engine incompatibility errors

---

**The fix is pushed to GitHub. Now manually update the Node version in Render Dashboard!** 🚀


