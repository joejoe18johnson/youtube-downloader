#!/bin/bash
# Restart script for YouTube Downloader server

echo "🛑 Stopping existing server..."
pkill -f "node.*server.js" 2>/dev/null || pkill -f "npm.*start" 2>/dev/null || echo "No server process found to stop"

# Wait a moment for the process to stop
sleep 2

echo "✅ Checking dependencies..."

# Check yt-dlp
if command -v yt-dlp &> /dev/null; then
    YTDLP_VERSION=$(yt-dlp --version 2>/dev/null)
    echo "✅ yt-dlp is available (version: $YTDLP_VERSION)"
else
    echo "⚠️  yt-dlp not found. Install with: brew install yt-dlp"
fi

# Check FFmpeg
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg is available"
else
    echo "⚠️  FFmpeg not found. Install with: brew install ffmpeg"
fi

echo ""
echo "🚀 Starting server..."
echo ""

cd "$(dirname "$0")"
npm start

