#!/bin/bash
# Build script for Render deployment
set -e  # Exit on any error

echo "🔨 Starting build process..."

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install || {
    echo "❌ npm install failed"
    exit 1
}

# Create bin directory
echo "📁 Creating bin directory..."
mkdir -p bin || {
    echo "⚠️  Could not create bin directory (might already exist)"
}

# Download yt-dlp
echo "⬇️  Downloading yt-dlp..."
if curl -f -L --retry 3 --max-time 60 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o bin/yt-dlp; then
    echo "✅ yt-dlp downloaded successfully"
elif wget --timeout=60 --tries=3 -O bin/yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp; then
    echo "✅ yt-dlp downloaded successfully (via wget)"
else
    echo "❌ Failed to download yt-dlp"
    echo "⚠️  Server will fallback to ytdl-core (may not work)"
    exit 0  # Don't fail build - server can still run
fi

# Make yt-dlp executable
echo "🔧 Making yt-dlp executable..."
chmod +x bin/yt-dlp || {
    echo "⚠️  Could not make yt-dlp executable"
    exit 1
}

# Verify installation
echo "✅ Verifying yt-dlp installation..."
if [ -f bin/yt-dlp ] && [ -x bin/yt-dlp ]; then
    echo "✅ yt-dlp is installed and executable"
    ./bin/yt-dlp --version || echo "⚠️  yt-dlp version check failed (but file exists)"
else
    echo "❌ yt-dlp installation verification failed"
    exit 1
fi

echo "✅ Build completed successfully!"

