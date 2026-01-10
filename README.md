# YouTube Downloader - Web Edition

A modern, web-based YouTube downloader built with HTML, CSS (Tailwind), and JavaScript. Features a beautiful, responsive UI and a Node.js backend server.

## Features

- 🎥 Download videos in high quality (MP4 format)
- 🎵 Download audio only (MP3 format)
- 📁 Automatic file downloads to your browser's download folder
- 🖥️ Cross-platform web application (works on any device with a browser)
- ✨ Modern, responsive UI with Tailwind CSS
- ⚡ Real-time download progress tracking
- 🎨 Beautiful, clean interface matching the original design

## Tech Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **YouTube Download**: ytdl-core
- **Audio/Video Processing**: FFmpeg (optional, for format conversion)

## Requirements

- Node.js 14.0.0 or higher
- npm (Node Package Manager)
- FFmpeg (optional, but recommended for better format support and audio conversion)

## Installation

### Step 1: Install Node.js

If you don't have Node.js installed:

**On Mac (using Homebrew):**
```bash
brew install node
```

**On Windows:**
- Download and install from [nodejs.org](https://nodejs.org/)
- Or use chocolatey: `choco install nodejs`

**On Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
```

### Step 2: Install FFmpeg (Recommended)

FFmpeg is required for MP3 audio conversion and video/audio merging.

**On Mac (using Homebrew):**
```bash
brew install ffmpeg
```

**On Windows:**
- Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- Extract and add to system PATH
- Or use chocolatey: `choco install ffmpeg`

**On Linux (Ubuntu/Debian):**
```bash
sudo apt install ffmpeg
```

### Step 3: Install Dependencies

Navigate to the project directory and install npm packages:

```bash
cd "web_Youtube_Downloader copy"
npm install
```

This will install:
- `express` - Web server framework
- `ytdl-core` - YouTube downloader library
- `fluent-ffmpeg` - FFmpeg wrapper for Node.js

## Usage

### Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

### Access the Application

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. Enter a YouTube URL in the input field
4. Select format (MP4 Video or MP3 Audio)
5. Click "Download"

The file will be downloaded to your browser's default download folder.

### Using Different Port

To use a different port, set the `PORT` environment variable:

**On Mac/Linux:**
```bash
PORT=8080 npm start
```

**On Windows:**
```bash
set PORT=8080 && npm start
```

## Features in Detail

### Format Selection

- **MP4 Video**: Downloads the video in MP4 format. If FFmpeg is available, it will merge video and audio streams for best quality.
- **MP3 Audio**: Downloads audio and converts to MP3 format. Requires FFmpeg for conversion. Without FFmpeg, downloads the best available audio format.

### Progress Tracking

The application shows real-time download progress with:
- Progress percentage
- Current status message
- Cancel button to stop downloads

### URL Validation

The application validates YouTube URLs and accepts:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`

## Project Structure

```
web_Youtube_Downloader copy/
├── index.html          # Main HTML file with Tailwind CSS
├── app.js              # Frontend JavaScript logic
├── server.js           # Node.js backend server
├── package.json        # Node.js dependencies
├── logo.png            # Application logo
└── README.md           # This file
```

## Troubleshooting

### Port Already in Use

If you get an error that port 3000 is already in use:

```bash
PORT=3001 npm start
```

Then access the application at `http://localhost:3001`.

### FFmpeg Not Found

If you see errors about FFmpeg not being found:

1. Make sure FFmpeg is installed (see Installation step 2)
2. Verify FFmpeg is in your system PATH:
   ```bash
   ffmpeg -version
   ```
3. If FFmpeg is not in PATH, the application will still work but:
   - Audio downloads will be in their original format (not MP3)
   - Video downloads may not have merged audio/video streams

### YouTube URL Not Working

- Make sure the URL is a valid YouTube video URL
- Some videos may have restrictions (age-restricted, region-locked, etc.)
- Private videos cannot be downloaded

### Download Fails

Common reasons:
- Internet connection issues
- YouTube video is unavailable
- Video format not supported
- Server timeout (for very large files)

Try:
1. Check your internet connection
2. Verify the YouTube URL works in a browser
3. Try a different video
4. Check server console for error messages

## Development

### Auto-reload During Development

Install nodemon globally:
```bash
npm install -g nodemon
```

Then run:
```bash
npm run dev
```

The server will automatically restart when you make changes to `server.js`.

### Customizing the UI

- Edit `index.html` for HTML structure
- Tailwind CSS classes can be modified directly in the HTML
- JavaScript logic is in `app.js`
- Server logic is in `server.js`

## Notes

- All downloads are saved with the video title as the filename
- Video downloads are saved as MP4 files
- Audio downloads are saved as MP3 files (with FFmpeg) or original format (without FFmpeg)
- The application respects YouTube's terms of service and copyright laws
- Downloads are processed server-side for security and compatibility

## License

MIT License - See LICENSE file for details

## Author

Johannes Joe Johnson

Made with ♥ in Belize
