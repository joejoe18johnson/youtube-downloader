#!/bin/bash
# Build script for Render deployment

echo "🔨 Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install npm dependencies
echo "📦 Installing npm dependencies..."
if ! npm install; then
    echo "❌ npm install failed"
    exit 1
fi

# Create bin directory
echo "📁 Creating bin directory..."
mkdir -p bin
echo "Created bin directory at: $(pwd)/bin"

# Download yt-dlp
echo "⬇️  Downloading yt-dlp from GitHub..."
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
DOWNLOAD_SUCCESS=false

# Try curl first
if command -v curl &> /dev/null; then
    echo "Trying curl..."
    if curl -f -L --retry 3 --max-time 60 --progress-bar "$YTDLP_URL" -o bin/yt-dlp; then
        echo "✅ yt-dlp downloaded successfully via curl"
        DOWNLOAD_SUCCESS=true
    else
        echo "⚠️  curl download failed, trying wget..."
    fi
fi

# Try wget if curl failed
if [ "$DOWNLOAD_SUCCESS" = false ] && command -v wget &> /dev/null; then
    echo "Trying wget..."
    if wget --timeout=60 --tries=3 --progress=bar:force "$YTDLP_URL" -O bin/yt-dlp 2>&1; then
        echo "✅ yt-dlp downloaded successfully via wget"
        DOWNLOAD_SUCCESS=true
    else
        echo "⚠️  wget download failed"
    fi
fi

# Check if download succeeded
if [ "$DOWNLOAD_SUCCESS" = false ]; then
    echo "❌ Failed to download yt-dlp using both curl and wget"
    echo "⚠️  Server will fallback to ytdl-core (may not work reliably)"
    echo "Checking if file exists anyway..."
    if [ -f bin/yt-dlp ]; then
        echo "✅ File exists (might be from previous build)"
        DOWNLOAD_SUCCESS=true
    else
        exit 0  # Don't fail build - let server start and fallback to ytdl-core
    fi
fi

# Make yt-dlp executable
if [ "$DOWNLOAD_SUCCESS" = true ]; then
    echo "🔧 Making yt-dlp executable..."
    chmod +x bin/yt-dlp || {
        echo "❌ Could not make yt-dlp executable"
        exit 1
    }
    
    # Verify installation
    echo "✅ Verifying yt-dlp installation..."
    if [ -f bin/yt-dlp ] && [ -x bin/yt-dlp ]; then
        echo "✅ yt-dlp file exists and is executable"
        echo "File location: $(pwd)/bin/yt-dlp"
        echo "File size: $(ls -lh bin/yt-dlp | awk '{print $5}')"
        
        # Try to get version
        if ./bin/yt-dlp --version 2>&1; then
            VERSION=$(./bin/yt-dlp --version 2>&1 | head -1)
            echo "✅ yt-dlp version: $VERSION"
        else
            echo "⚠️  yt-dlp version check failed (but file exists and is executable)"
            echo "This might be OK - server will try to use it"
        fi
    else
        echo "❌ yt-dlp installation verification failed"
        echo "File exists: $([ -f bin/yt-dlp ] && echo 'yes' || echo 'no')"
        echo "File executable: $([ -x bin/yt-dlp ] && echo 'yes' || echo 'no')"
        exit 1
    fi
fi

echo "✅ Build completed successfully!"
echo "Final check - bin directory contents:"
ls -la bin/ 2>/dev/null || echo "bin directory not accessible"

