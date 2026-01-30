#!/bin/bash
# Script to install yt-dlp for Render deployment
# This script will be executed during Render build

echo "Installing yt-dlp..."

# Check if Python is available (for pip install)
if command -v python3 &> /dev/null || command -v python &> /dev/null; then
    echo "Python found. Installing yt-dlp via pip..."
    if command -v pip3 &> /dev/null; then
        pip3 install --user yt-dlp || pip install --user yt-dlp
    elif command -v pip &> /dev/null; then
        pip install --user yt-dlp
    else
        echo "pip not found. Trying alternative installation method..."
    fi
fi

# Alternative: Download yt-dlp binary directly (works on Linux)
if ! command -v yt-dlp &> /dev/null; then
    echo "yt-dlp not found via pip. Trying direct download..."
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp
    chmod +x /tmp/yt-dlp
    sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp 2>/dev/null || mv /tmp/yt-dlp /usr/local/bin/yt-dlp 2>/dev/null || cp /tmp/yt-dlp ~/.local/bin/yt-dlp 2>/dev/null || export PATH=$PATH:/tmp
fi

# Verify installation
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp installed successfully!"
    yt-dlp --version
else
    echo "⚠️  Warning: yt-dlp installation may have failed. The server will fallback to ytdl-core (may not work)."
    echo "To install manually on Render, add this to your build command:"
    echo "  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp && sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp"
fi


