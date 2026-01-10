# Quick Start Guide

## Installation

1. **Install Node.js** (if not already installed)
   ```bash
   # Check if Node.js is installed
   node --version
   npm --version
   ```

2. **Install FFmpeg** (recommended for best format support)
   ```bash
   # Mac
   brew install ffmpeg
   
   # Windows (with Chocolatey)
   choco install ffmpeg
   
   # Linux (Ubuntu/Debian)
   sudo apt install ffmpeg
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Running the Application

1. **Start the Server**
   ```bash
   npm start
   ```

2. **Open in Browser**
   - Navigate to: `http://localhost:3000`
   - Or the port shown in the terminal

3. **Download a Video**
   - Paste a YouTube URL
   - Select format (MP4 Video or MP3 Audio)
   - Click "Download"
   - The file will download to your browser's download folder

## Development Mode

For auto-reload during development:
```bash
npm run dev
```

This requires `nodemon` which can be installed globally:
```bash
npm install -g nodemon
```

## Troubleshooting

### Port Already in Use
```bash
PORT=3001 npm start
```

### FFmpeg Not Found
The app will still work without FFmpeg, but:
- Audio downloads will be in original format (not MP3)
- Video downloads may not have merged audio/video streams

### Installation Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

