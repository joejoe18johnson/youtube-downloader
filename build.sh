#!/bin/bash
# Build script for Render deployment
# Note: This script should NOT fail the build even if yt-dlp installation fails
# The server can start without yt-dlp and will fallback to ytdl-core

set +e  # Don't exit on errors - we want build to succeed even if yt-dlp fails

echo "🔨 Starting build process..."
echo "Current directory: $(pwd)"
echo "Node version: $(node --version 2>/dev/null || echo 'not available')"
echo "NPM version: $(npm --version 2>/dev/null || echo 'not available')"

# Check Node version requirement
REQUIRED_NODE="20.18.1"
CURRENT_NODE=$(node --version 2>/dev/null | sed 's/v//' || echo "0.0.0")
echo "Current Node version: $CURRENT_NODE"
echo "Required Node version: >=$REQUIRED_NODE"

# Try to use .nvmrc if available and nvm is installed
if [ -f .nvmrc ] && command -v nvm &> /dev/null; then
    echo "Found .nvmrc file, using nvm to switch Node version..."
    source ~/.nvm/nvm.sh 2>/dev/null || true
    nvm use 2>/dev/null || nvm install 20 2>/dev/null || echo "⚠️  nvm not available or failed"
    echo "Node version after nvm: $(node --version 2>/dev/null || echo 'not available')"
fi

# Install npm dependencies (this must succeed for build to work)
# Note: If using yarn, it will check engines field in package.json
echo "📦 Installing npm dependencies..."
if command -v yarn &> /dev/null && [ -f yarn.lock ]; then
    echo "Using yarn (yarn.lock found)..."
    # Yarn checks engines field - Node 20 should be used
    yarn install --ignore-engines 2>&1 || yarn install 2>&1
    NPM_EXIT_CODE=$?
else
    echo "Using npm..."
    npm install
    NPM_EXIT_CODE=$?
fi

if [ $NPM_EXIT_CODE -ne 0 ]; then
    echo "❌ Package installation failed with exit code $NPM_EXIT_CODE"
    echo "⚠️  This might be due to Node version incompatibility"
    echo "Current Node version: $CURRENT_NODE"
    echo "Required: >=$REQUIRED_NODE"
    echo "⚠️  Please update Node version to 20 in Render Dashboard Settings"
    exit 1  # Only fail build if npm/yarn install fails
fi
echo "✅ Package installation completed successfully"

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
    echo "Checking if file exists from previous build..."
    if [ -f bin/yt-dlp ]; then
        echo "✅ File exists (might be from previous build)"
        DOWNLOAD_SUCCESS=true
    else
        echo "⚠️  yt-dlp is not available - server will fallback to ytdl-core (may not work reliably)"
        echo "⚠️  Build will continue successfully, but downloads may fail"
        DOWNLOAD_SUCCESS=false
    fi
fi

# Make yt-dlp executable and verify
if [ "$DOWNLOAD_SUCCESS" = true ]; then
    echo "🔧 Making yt-dlp executable..."
    if chmod +x bin/yt-dlp; then
        echo "✅ Made yt-dlp executable"
    else
        echo "⚠️  Could not make yt-dlp executable (might already be executable or permission issue)"
    fi
    
    # Verify installation
    echo "✅ Verifying yt-dlp installation..."
    if [ -f bin/yt-dlp ]; then
        echo "✅ yt-dlp file exists"
        echo "File location: $(pwd)/bin/yt-dlp"
        FILE_SIZE=$(ls -lh bin/yt-dlp 2>/dev/null | awk '{print $5}' || echo "unknown")
        echo "File size: $FILE_SIZE"
        
        # Check if executable
        if [ -x bin/yt-dlp ]; then
            echo "✅ yt-dlp is executable"
            
            # Try to get version (don't fail build if this fails)
            if ./bin/yt-dlp --version 2>&1 | head -1; then
                VERSION=$(./bin/yt-dlp --version 2>&1 | head -1)
                echo "✅ yt-dlp version: $VERSION"
            else
                echo "⚠️  yt-dlp version check failed (but file exists and is executable)"
                echo "⚠️  Server will try to use it - if it fails, will fallback to ytdl-core"
            fi
        else
            echo "⚠️  yt-dlp file exists but is not executable"
            echo "⚠️  Attempting to make it executable again..."
            chmod +x bin/yt-dlp || echo "⚠️  Still not executable - server may not be able to use it"
        fi
    else
        echo "❌ yt-dlp file does not exist after download"
        echo "⚠️  Build will continue but server will fallback to ytdl-core"
    fi
else
    echo "⚠️  yt-dlp download was not successful and file does not exist"
    echo "⚠️  Server will start but will fallback to ytdl-core (may not work reliably)"
fi

echo ""
echo "✅ Build completed successfully!"
if [ "$DOWNLOAD_SUCCESS" = true ]; then
    echo "✅ yt-dlp is installed and ready to use"
else
    echo "⚠️  yt-dlp is NOT available - server will use ytdl-core as fallback"
    echo "⚠️  Downloads may fail with 'YouTube structure change' error"
fi
echo ""
echo "Final check - bin directory contents:"
ls -la bin/ 2>/dev/null || echo "bin directory not accessible or empty"
echo ""

# Always exit successfully (build succeeded even if yt-dlp installation failed)
# The only time we exit with non-zero is if npm install fails (which we check earlier)
exit 0

