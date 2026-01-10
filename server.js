const express = require('express');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (allow all origins for development)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Test routes
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', timestamp: new Date().toISOString() });
});

// Test POST route to verify POST works
app.post('/api/test-post', (req, res) => {
    res.json({ message: 'POST is working', body: req.body, timestamp: new Date().toISOString() });
});

// Store progress for polling (keyed by session ID)
let currentProgress = {};
// Store download info for mobile downloads (keyed by session ID)
let downloadInfo = {};

// Check if ffmpeg is available
function checkFFmpeg() {
    return new Promise((resolve) => {
        ffmpeg.getAvailableEncoders((err, encoders) => {
            resolve(!err && encoders && Object.keys(encoders).length > 0);
        });
    });
}

// Check if yt-dlp is available
async function checkYtDlp() {
    try {
        const { stdout } = await execAsync('which yt-dlp || which youtube-dl');
        return stdout.trim().length > 0;
    } catch {
        return false;
    }
}

// Download using yt-dlp and stream directly to HTTP response (more reliable than ytdl-core)
async function downloadWithYtDlpStreaming(url, format, res, sessionId) {
    const hasFFmpeg = await checkFFmpeg();
    
    return new Promise(async (resolve, reject) => {
        // First get video info to determine filename
        let videoTitle = 'download';
        try {
            // Get video title using yt-dlp
            const { stdout: infoOutput } = await execAsync(`yt-dlp --get-title --no-playlist "${url}"`, { timeout: 10000 });
            if (infoOutput && infoOutput.trim()) {
                videoTitle = sanitizeFilename(infoOutput.trim());
            }
        } catch (err) {
            console.warn('Could not get video title from yt-dlp, using default');
        }
        
        let args = [
            url,
            '--no-playlist',
            '--no-warnings',
            '-o', '-', // Output to stdout
        ];

        if (format === 'audio') {
            if (hasFFmpeg) {
                args.push(
                    '-x',
                    '--audio-format', 'mp3',
                    '--audio-quality', '192K',
                    '-f', 'bestaudio'
                );
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
            } else {
                args.push('-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best');
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.m4a"`);
            }
        } else {
            // Video
            if (hasFFmpeg) {
                args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
                args.push('--merge-output-format', 'mp4');
            } else {
                args.push('-f', 'best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best');
            }
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
        }

        // Try yt-dlp first, fallback to youtube-dl
        let command = 'yt-dlp';
        currentProgress[sessionId] = { progress: 0, message: 'Preparing download...', title: videoTitle };
        
        const ytdlpProcess = spawn(command, args);

        let downloadedBytes = 0;
        let totalBytes = 0;

        // Stream stdout directly to response
        ytdlpProcess.stdout.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            res.write(chunk);
            
            // Try to parse progress if available (yt-dlp writes progress to stderr)
        });

        // yt-dlp writes progress to stderr
        ytdlpProcess.stderr.on('data', (data) => {
            const progressText = data.toString();
            // Parse progress: [download] XX.X% of Y.YMiB at Z.ZMiB/s ETA HH:MM:SS
            const progressMatch = progressText.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
            if (progressMatch) {
                const percent = parseFloat(progressMatch[1]);
                currentProgress[sessionId] = {
                    progress: percent,
                    message: `Downloading: ${percent.toFixed(1)}%`,
                    title: videoTitle
                };
            }
        });

        ytdlpProcess.on('close', (code) => {
            if (code === 0) {
                currentProgress[sessionId] = { progress: 100, message: 'Download complete!', title: videoTitle };
                res.end();
                setTimeout(() => {
                    delete currentProgress[sessionId];
                    setTimeout(() => delete downloadInfo[sessionId], 3600000);
                }, 5000);
                resolve();
            } else {
                reject(new Error(`yt-dlp failed with exit code ${code}`));
            }
        });

        ytdlpProcess.on('error', (error) => {
            // If yt-dlp not found, try youtube-dl
            if (error.code === 'ENOENT' && command === 'yt-dlp') {
                command = 'youtube-dl';
                const ytdlProcess = spawn(command, args);
                
                ytdlProcess.stdout.on('data', (chunk) => {
                    res.write(chunk);
                });
                
                ytdlProcess.stderr.on('data', (data) => {
                    const progressText = data.toString();
                    const progressMatch = progressText.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
                    if (progressMatch) {
                        const percent = parseFloat(progressMatch[1]);
                        currentProgress[sessionId] = {
                            progress: percent,
                            message: `Downloading: ${percent.toFixed(1)}%`,
                            title: videoTitle
                        };
                    }
                });
                
                ytdlProcess.on('close', (code) => {
                    if (code === 0) {
                        currentProgress[sessionId] = { progress: 100, message: 'Download complete!', title: videoTitle };
                        res.end();
                        setTimeout(() => {
                            delete currentProgress[sessionId];
                            setTimeout(() => delete downloadInfo[sessionId], 3600000);
                        }, 5000);
                        resolve();
                    } else {
                        reject(new Error(`youtube-dl failed with exit code ${code}`));
                    }
                });
                
                ytdlProcess.on('error', (err) => {
                    reject(new Error(`Neither yt-dlp nor youtube-dl found. Please install yt-dlp: pip install yt-dlp or brew install yt-dlp`));
                });
            } else {
                reject(error);
            }
        });
        
        // Handle client disconnect
        res.on('close', () => {
            if (!ytdlpProcess.killed) {
                ytdlpProcess.kill();
            }
        });
    });
}

// Helper function to handle stream errors with better messages
function handleStreamError(error, res, session) {
    console.error('Stream error:', error);
    delete currentProgress[session];
    let errorMessage = error.message || 'Stream error occurred';
    
    // Handle 403 errors specifically
    if (error.statusCode === 403 || error.message?.includes('403')) {
        errorMessage = 'YouTube blocked the download request (403 Forbidden). YouTube may be blocking automated requests. Please try again in a few minutes or use a different video.';
    } else if (error.message?.includes('MinigetError') && error.statusCode === 403) {
        errorMessage = 'YouTube blocked the download request. This video may be unavailable for download or YouTube has rate-limited this request. Please try again later.';
    } else if (error.message?.includes('MinigetError')) {
        errorMessage = 'Network error while downloading. Please try again.';
    }
    
    if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
    } else {
        res.end();
    }
}

// Download endpoint - must be defined BEFORE static middleware
app.post('/api/download', async (req, res) => {
    console.log('=== POST /api/download route hit ===');
    console.log('Request method:', req.method);
    console.log('Request path:', req.path);
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    const { url, format, sessionId } = req.body;

    console.log('Download request received:', { url: url?.substring(0, 50), format, sessionId });

    if (!url) {
        console.error('No URL provided');
        return res.status(400).json({ error: 'URL is required' });
    }

    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
        console.error('Invalid YouTube URL:', url);
        return res.status(400).json({ error: 'Invalid YouTube URL. Please make sure you entered a valid YouTube video URL.' });
    }

    // Generate session ID if not provided
    const session = sessionId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        console.log('Getting video info for URL:', url);
        // Get video info with options to handle YouTube API changes and avoid 403 errors
        const requestOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            }
        };
        
        // Check if yt-dlp is available - use it as it's more reliable
        const hasYtDlp = await checkYtDlp();
        
        if (hasYtDlp) {
            console.log('Using yt-dlp for download (more reliable)');
            await downloadWithYtDlpStreaming(url, format, res, session);
            return; // Exit early if yt-dlp download succeeds
        }
        
        // Fallback to ytdl-core if yt-dlp is not available
        let info;
        try {
            info = await ytdl.getInfo(url, {
                requestOptions: requestOptions
            });
        } catch (ytdlError) {
            console.error('ytdl-core getInfo error:', ytdlError);
            // Handle parsing errors specifically
            if (ytdlError.message && (ytdlError.message.includes('Error when parsing watch.html') || 
                ytdlError.message.includes('maybe YouTube made a change') ||
                ytdlError.message.includes('Could not extract functions') ||
                ytdlError.message.includes('Sign in to confirm your age'))) {
                // Check again if yt-dlp is available (might have been installed)
                const hasYtDlp = await checkYtDlp();
                if (hasYtDlp) {
                    console.log('yt-dlp found! Retrying with yt-dlp...');
                    await downloadWithYtDlpStreaming(url, format, res, session);
                    return; // Exit early if yt-dlp download succeeds
                }
                
                // Provide helpful error message with installation instructions
                const errorMsg = process.env.RENDER ? 
                    'YouTube has changed their website structure. Please install yt-dlp in your Render build command:\n\n' +
                    'Build Command: npm install && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp && sudo mv /tmp/yt-dlp /usr/local/bin/yt-dlp\n\n' +
                    'See RENDER_DEPLOY.md for detailed instructions.' :
                    'YouTube has changed their website structure and the JavaScript library cannot parse it. For better compatibility, please install yt-dlp:\n\n' +
                    '• Mac: brew install yt-dlp\n' +
                    '• Linux: pip install yt-dlp OR curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp\n' +
                    '• Windows: pip install yt-dlp\n' +
                    '• Then restart the server.\n\n' +
                    'Alternatively, wait for the library maintainers to update @distube/ytdl-core.';
                    
                throw new Error(errorMsg);
            }
            throw ytdlError;
        }
        
        console.log('Video info retrieved:', info.videoDetails.title);
        const videoTitle = sanitizeFilename(info.videoDetails.title);
        
        // Store download info for mobile access (keep URL and format, we'll re-fetch info if needed)
        downloadInfo[session] = {
            url: url,
            format: format,
            title: videoTitle,
            timestamp: Date.now()
        };
        
        currentProgress[session] = { progress: 0, message: 'Starting download...', title: videoTitle };

        if (format === 'audio') {
            // Download audio as MP3
            const hasFFmpeg = await checkFFmpeg();
            
            if (!hasFFmpeg) {
                // Download best audio format available without conversion
                const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                if (audioFormats.length === 0) {
                    return res.status(400).json({ error: 'No audio format available' });
                }

                const audioFormat = audioFormats[0];
                
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${audioFormat.container}"`);
                res.setHeader('Content-Type', 'application/octet-stream');

                const stream = ytdl.downloadFromInfo(info, { 
                    format: audioFormat,
                    requestOptions: requestOptions
                });
                
                stream.on('progress', (chunkLength, downloaded, total) => {
                    if (total) {
                        const percent = (downloaded / total) * 100;
                        currentProgress[session] = {
                            progress: percent,
                            message: `Downloading audio: ${percent.toFixed(1)}%`,
                            title: videoTitle
                        };
                    }
                });

                stream.on('error', (error) => {
                    handleStreamError(error, res, session);
                });

                stream.on('end', () => {
                    console.log('Stream ended successfully');
                    currentProgress[session] = { progress: 100, message: 'Download complete!', title: videoTitle };
                    setTimeout(() => {
                        delete currentProgress[session];
                        // Keep downloadInfo for 1 hour for mobile access
                        setTimeout(() => delete downloadInfo[session], 3600000);
                    }, 5000);
                });

                // Handle client disconnect
                res.on('close', () => {
                    if (!stream.destroyed) {
                        stream.destroy();
                    }
                });

                stream.pipe(res);

            } else {
                // Convert to MP3 using FFmpeg
                const tempFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp4`);
                const outputFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp3`);

                // Download video with audio
                const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                if (audioFormats.length === 0) {
                    return res.status(400).json({ error: 'No audio format available' });
                }

                const audioFormat = audioFormats[0];
                const audioStream = ytdl.downloadFromInfo(info, { 
                    format: audioFormat,
                    requestOptions: requestOptions
                });
                const writeStream = fs.createWriteStream(tempFile);

                audioStream.pipe(writeStream);

                audioStream.on('progress', (chunkLength, downloaded, total) => {
                    if (total) {
                        const percent = (downloaded / total) * 50; // First 50% is download
                        currentProgress[session] = {
                            progress: percent,
                            message: `Downloading audio: ${percent.toFixed(1)}%`,
                            title: videoTitle
                        };
                    }
                });

                writeStream.on('finish', () => {
                    currentProgress[session] = { progress: 50, message: 'Converting to MP3...', title: videoTitle };

                    // Convert to MP3
                    ffmpeg(tempFile)
                        .audioBitrate(192)
                        .format('mp3')
                        .on('progress', (progress) => {
                            const percent = 50 + (progress.percent || 0) / 2; // Second 50% is conversion
                            currentProgress[session] = {
                                progress: percent,
                                message: `Converting to MP3: ${(progress.percent || 0).toFixed(1)}%`,
                                title: videoTitle
                            };
                        })
                        .on('end', () => {
                            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
                            res.setHeader('Content-Type', 'audio/mpeg');
                            
                            const readStream = fs.createReadStream(outputFile);
                            readStream.pipe(res);

                            readStream.on('end', () => {
                                // Cleanup
                                fs.unlinkSync(tempFile);
                                fs.unlinkSync(outputFile);
                                currentProgress[session] = { progress: 100, message: 'Download complete!', title: videoTitle };
                                setTimeout(() => delete currentProgress[session], 5000);
                            });
                        })
                        .on('error', (error) => {
                            // Cleanup on error
                            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                            delete currentProgress[session];
                            if (!res.headersSent) {
                                res.status(500).json({ error: `Conversion error: ${error.message}` });
                            }
                        })
                        .save(outputFile);
                });

                writeStream.on('error', (error) => {
                    delete currentProgress[session];
                    if (!res.headersSent) {
                        res.status(500).json({ error: error.message });
                    }
                });
            }

        } else {
            // Download video as MP4
            const hasFFmpeg = await checkFFmpeg();

            if (!hasFFmpeg) {
                // Download best MP4 format available without conversion
                const videoFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
                const mp4Formats = videoFormats.filter(f => f.container === 'mp4');
                
                if (mp4Formats.length === 0) {
                    // Fallback to best format
                    const bestFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
                    res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${bestFormat.container}"`);
                    res.setHeader('Content-Type', 'application/octet-stream');

                    const stream = ytdl.downloadFromInfo(info, { 
                        format: bestFormat,
                        requestOptions: requestOptions
                    });
                    
                    stream.on('progress', (chunkLength, downloaded, total) => {
                        if (total) {
                            const percent = (downloaded / total) * 100;
                            currentProgress[session] = {
                                progress: percent,
                                message: `Downloading video: ${percent.toFixed(1)}%`,
                                title: videoTitle
                            };
                        }
                    });

                    stream.on('error', (error) => {
                        console.error('Stream error:', error);
                        delete currentProgress[session];
                        if (!res.headersSent) {
                            res.status(500).json({ error: error.message || 'Stream error occurred' });
                        } else {
                            res.end();
                        }
                    });

                    stream.on('end', () => {
                        console.log('Stream ended successfully');
                        currentProgress[session] = { progress: 100, message: 'Download complete!', title: videoTitle };
                        setTimeout(() => {
                            delete currentProgress[session];
                            setTimeout(() => delete downloadInfo[session], 3600000);
                        }, 5000);
                    });

                    res.on('close', () => {
                        if (!stream.destroyed) {
                            stream.destroy();
                        }
                    });

                    stream.pipe(res);
                } else {
                    const mp4Format = mp4Formats[0];
                    res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
                    res.setHeader('Content-Type', 'video/mp4');

                    const stream = ytdl.downloadFromInfo(info, { 
                        format: mp4Format,
                        requestOptions: requestOptions
                    });
                    
                    stream.on('progress', (chunkLength, downloaded, total) => {
                        if (total) {
                            const percent = (downloaded / total) * 100;
                            currentProgress[session] = {
                                progress: percent,
                                message: `Downloading video: ${percent.toFixed(1)}%`,
                                title: videoTitle
                            };
                        }
                    });

                    stream.on('error', (error) => {
                        console.error('Stream error:', error);
                        delete currentProgress[session];
                        if (!res.headersSent) {
                            res.status(500).json({ error: error.message || 'Stream error occurred' });
                        } else {
                            res.end();
                        }
                    });

                    stream.on('end', () => {
                        console.log('Stream ended successfully');
                        currentProgress[session] = { progress: 100, message: 'Download complete!', title: videoTitle };
                        setTimeout(() => {
                            delete currentProgress[session];
                            setTimeout(() => delete downloadInfo[session], 3600000);
                        }, 5000);
                    });

                    res.on('close', () => {
                        if (!stream.destroyed) {
                            stream.destroy();
                        }
                    });

                    stream.pipe(res);
                }
            } else {
                // Download best video + audio and merge with FFmpeg
                const videoFormat = ytdl.chooseFormat(info.formats, {
                    quality: 'highestvideo',
                    filter: 'videoonly'
                });
                const audioFormat = ytdl.chooseFormat(info.formats, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });

                if (!videoFormat || !audioFormat) {
                    return res.status(400).json({ error: 'Could not find suitable video/audio formats' });
                }

                const videoFile = path.join(os.tmpdir(), `${Date.now()}_video_${videoTitle}.mp4`);
                const audioFile = path.join(os.tmpdir(), `${Date.now()}_audio_${videoTitle}.m4a`);
                const outputFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp4`);

                // Download video and audio in parallel
                let videoDownloaded = false;
                let audioDownloaded = false;
                let videoProgress = 0;
                let audioProgress = 0;

                const videoStream = ytdl.downloadFromInfo(info, { 
                    format: videoFormat,
                    requestOptions: requestOptions
                });
                const audioStream = ytdl.downloadFromInfo(info, { 
                    format: audioFormat,
                    requestOptions: requestOptions
                });

                const videoWriteStream = fs.createWriteStream(videoFile);
                const audioWriteStream = fs.createWriteStream(audioFile);

                videoStream.pipe(videoWriteStream);
                audioStream.pipe(audioWriteStream);

                videoStream.on('progress', (chunkLength, downloaded, total) => {
                    if (total) {
                        videoProgress = (downloaded / total) * 50;
                        currentProgress[session] = {
                            progress: videoProgress + audioProgress,
                            message: `Downloading video: ${(videoProgress + audioProgress).toFixed(1)}%`,
                            title: videoTitle
                        };
                    }
                });

                audioStream.on('progress', (chunkLength, downloaded, total) => {
                    if (total) {
                        audioProgress = (downloaded / total) * 50;
                        currentProgress[session] = {
                            progress: videoProgress + audioProgress,
                            message: `Downloading video: ${(videoProgress + audioProgress).toFixed(1)}%`,
                            title: videoTitle
                        };
                    }
                });

                videoWriteStream.on('finish', () => {
                    videoDownloaded = true;
                    checkAndMerge();
                });

                audioWriteStream.on('finish', () => {
                    audioDownloaded = true;
                    checkAndMerge();
                });

                function checkAndMerge() {
                    if (videoDownloaded && audioDownloaded) {
                        currentProgress[session] = { progress: 90, message: 'Merging video and audio...', title: videoTitle };

                        // Merge video and audio
                        ffmpeg()
                            .input(videoFile)
                            .input(audioFile)
                            .videoCodec('copy')
                            .audioCodec('copy')
                            .format('mp4')
                            .on('end', () => {
                                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
                                res.setHeader('Content-Type', 'video/mp4');
                                
                                const readStream = fs.createReadStream(outputFile);
                                readStream.pipe(res);

                                readStream.on('end', () => {
                                    // Cleanup
                                    fs.unlinkSync(videoFile);
                                    fs.unlinkSync(audioFile);
                                    fs.unlinkSync(outputFile);
                                    currentProgress[session] = { progress: 100, message: 'Download complete!', title: videoTitle };
                                    setTimeout(() => delete currentProgress[session], 5000);
                                });
                            })
                            .on('error', (error) => {
                                // Cleanup on error
                                if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
                                if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
                                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                                delete currentProgress[session];
                                if (!res.headersSent) {
                                    res.status(500).json({ error: `Merge error: ${error.message}` });
                                }
                            })
                            .save(outputFile);
                    }
                }

                videoStream.on('error', (error) => {
                    console.error('Video stream error:', error);
                    delete currentProgress[session];
                    handleStreamError(error, res, session);
                });

                audioStream.on('error', (error) => {
                    console.error('Audio stream error:', error);
                    delete currentProgress[session];
                    handleStreamError(error, res, session);
                });
            }
        }

        // For formats that need conversion, return session ID and start background processing
        // For direct streaming formats, the file is already being streamed in the code above
        
    } catch (error) {
        const session = req.body.sessionId || req.body.session || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        delete currentProgress[session];
        console.error('Download error:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: error.message || 'Download failed',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } else {
            // If headers already sent, try to end the response
            res.end();
        }
    }
});

// Progress endpoint (polling)
app.get('/api/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const progress = currentProgress[sessionId] || { progress: 0, message: 'Initializing...', title: '' };
    res.json(progress);
});

// Mobile download endpoint (for QR code scanning)
app.get('/api/mobile-download/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { format } = req.query;

    // Get download info from session
    const info = downloadInfo[sessionId];
    if (!info) {
        return res.status(404).json({ error: 'Download session not found or expired' });
    }

    const { url, title } = info;
    const downloadFormat = format || info.format;

    try {
        // Validate YouTube URL
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Clean up old download info (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        Object.keys(downloadInfo).forEach(key => {
            if (downloadInfo[key].timestamp && downloadInfo[key].timestamp < oneHourAgo) {
                delete downloadInfo[key];
            }
        });

        // Get fresh video info with options to handle YouTube API changes and avoid 403 errors
        const mobileRequestOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            }
        };
        
        const videoInfo = await ytdl.getInfo(url, {
            requestOptions: mobileRequestOptions
        });
        const videoTitle = sanitizeFilename(videoInfo.videoDetails.title);

        if (downloadFormat === 'audio') {
            // Download audio as MP3
            const hasFFmpeg = await checkFFmpeg();
            
            if (!hasFFmpeg) {
                // Download best audio format available without conversion
                const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
                if (audioFormats.length === 0) {
                    return res.status(400).json({ error: 'No audio format available' });
                }

                const audioFormat = audioFormats[0];
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${audioFormat.container}"`);
                res.setHeader('Content-Type', 'application/octet-stream');

                const stream = ytdl.downloadFromInfo(videoInfo, { 
                    format: audioFormat,
                    requestOptions: mobileRequestOptions
                });
                stream.pipe(res);

                stream.on('error', (error) => {
                    handleStreamError(error, res, sessionId);
                });
            } else {
                // Convert to MP3 using FFmpeg
                const tempFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp4`);
                const outputFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp3`);

                const audioFormats = ytdl.filterFormats(videoInfo.formats, 'audioonly');
                if (audioFormats.length === 0) {
                    return res.status(400).json({ error: 'No audio format available' });
                }

                const audioFormat = audioFormats[0];
                const audioStream = ytdl.downloadFromInfo(videoInfo, { 
                    format: audioFormat,
                    requestOptions: mobileRequestOptions
                });
                const writeStream = fs.createWriteStream(tempFile);

                audioStream.pipe(writeStream);

                audioStream.on('error', (error) => {
                    console.error('Mobile audio stream download error:', error);
                    if (!res.headersSent) {
                        let errorMessage = error.message || 'Stream error occurred';
                        if (error.statusCode === 403 || error.message?.includes('403')) {
                            errorMessage = 'YouTube blocked the download request. Please try again in a few minutes.';
                        }
                        res.status(500).json({ error: errorMessage });
                    }
                });

                writeStream.on('finish', () => {
                    ffmpeg(tempFile)
                        .audioBitrate(192)
                        .format('mp3')
                        .on('end', () => {
                            res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
                            res.setHeader('Content-Type', 'audio/mpeg');
                            
                            const readStream = fs.createReadStream(outputFile);
                            readStream.pipe(res);

                            readStream.on('end', () => {
                                fs.unlinkSync(tempFile);
                                fs.unlinkSync(outputFile);
                            });
                        })
                        .on('error', (error) => {
                            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                            if (!res.headersSent) {
                                res.status(500).json({ error: `Conversion error: ${error.message}` });
                            }
                        })
                        .save(outputFile);
                });

                writeStream.on('error', (error) => {
                    if (!res.headersSent) {
                        res.status(500).json({ error: error.message });
                    }
                });
            }
        } else {
            // Download video as MP4
            const hasFFmpeg = await checkFFmpeg();

            if (!hasFFmpeg) {
                const videoFormats = ytdl.filterFormats(videoInfo.formats, 'videoandaudio');
                const mp4Formats = videoFormats.filter(f => f.container === 'mp4');
                
                const formatToUse = mp4Formats.length > 0 ? mp4Formats[0] : ytdl.chooseFormat(videoInfo.formats, { quality: 'highest' });
                
                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.${formatToUse.container}"`);
                res.setHeader('Content-Type', 'application/octet-stream');

                const stream = ytdl.downloadFromInfo(videoInfo, { 
                    format: formatToUse,
                    requestOptions: mobileRequestOptions
                });
                stream.pipe(res);

                stream.on('error', (error) => {
                    handleStreamError(error, res, sessionId);
                });
            } else {
                // Download and merge with FFmpeg
                const videoFormat = ytdl.chooseFormat(videoInfo.formats, {
                    quality: 'highestvideo',
                    filter: 'videoonly'
                });
                const audioFormat = ytdl.chooseFormat(videoInfo.formats, {
                    quality: 'highestaudio',
                    filter: 'audioonly'
                });

                if (!videoFormat || !audioFormat) {
                    return res.status(400).json({ error: 'Could not find suitable video/audio formats' });
                }

                const videoFile = path.join(os.tmpdir(), `${Date.now()}_video_${videoTitle}.mp4`);
                const audioFile = path.join(os.tmpdir(), `${Date.now()}_audio_${videoTitle}.m4a`);
                const outputFile = path.join(os.tmpdir(), `${Date.now()}_${videoTitle}.mp4`);

                let videoDownloaded = false;
                let audioDownloaded = false;

                const videoStream = ytdl.downloadFromInfo(videoInfo, { 
                    format: videoFormat,
                    requestOptions: mobileRequestOptions
                });
                const audioStream = ytdl.downloadFromInfo(videoInfo, { 
                    format: audioFormat,
                    requestOptions: mobileRequestOptions
                });

                const videoWriteStream = fs.createWriteStream(videoFile);
                const audioWriteStream = fs.createWriteStream(audioFile);

                videoStream.pipe(videoWriteStream);
                audioStream.pipe(audioWriteStream);

                videoWriteStream.on('finish', () => {
                    videoDownloaded = true;
                    checkAndMerge();
                });

                audioWriteStream.on('finish', () => {
                    audioDownloaded = true;
                    checkAndMerge();
                });

                function checkAndMerge() {
                    if (videoDownloaded && audioDownloaded) {
                        ffmpeg()
                            .input(videoFile)
                            .input(audioFile)
                            .videoCodec('copy')
                            .audioCodec('copy')
                            .format('mp4')
                            .on('end', () => {
                                res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
                                res.setHeader('Content-Type', 'video/mp4');
                                
                                const readStream = fs.createReadStream(outputFile);
                                readStream.pipe(res);

                                readStream.on('end', () => {
                                    fs.unlinkSync(videoFile);
                                    fs.unlinkSync(audioFile);
                                    fs.unlinkSync(outputFile);
                                });
                            })
                            .on('error', (error) => {
                                if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);
                                if (fs.existsSync(audioFile)) fs.unlinkSync(audioFile);
                                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                                if (!res.headersSent) {
                                    res.status(500).json({ error: `Merge error: ${error.message}` });
                                }
                            })
                            .save(outputFile);
                    }
                }

                videoStream.on('error', (error) => {
                    console.error('Mobile video stream error:', error);
                    let errorMessage = error.message || 'Stream error occurred';
                    if (error.statusCode === 403 || error.message?.includes('403')) {
                        errorMessage = 'YouTube blocked the download request. Please try again in a few minutes.';
                    }
                    if (!res.headersSent) {
                        res.status(500).json({ error: errorMessage });
                    }
                });

                audioStream.on('error', (error) => {
                    console.error('Mobile audio stream error:', error);
                    let errorMessage = error.message || 'Stream error occurred';
                    if (error.statusCode === 403 || error.message?.includes('403')) {
                        errorMessage = 'YouTube blocked the download request. Please try again in a few minutes.';
                    }
                    if (!res.headersSent) {
                        res.status(500).json({ error: errorMessage });
                    }
                });
            }
        }

    } catch (error) {
        const session = req.body?.sessionId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        delete currentProgress[session];
        console.error('Download error in catch block:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        let errorMessage = error.message || 'Download failed';
        
        // Handle specific ytdl-core errors
        if (error.message && error.message.includes('Error when parsing watch.html') || error.message?.includes('maybe YouTube made a change')) {
            errorMessage = 'YouTube has changed their website structure. The download library needs to be updated. Please try: npm install @distube/ytdl-core@latest and restart the server.';
        } else if (error.statusCode === 403 || (error.message && error.message.includes('403'))) {
            errorMessage = 'YouTube blocked the download request (403 Forbidden). YouTube may be blocking automated requests. Please try again in a few minutes or use a different video.';
        } else if (error.message && error.message.includes('Could not extract functions') || error.message?.includes('Could not parse decipher')) {
            errorMessage = 'YouTube has changed their API and the video decryption keys could not be extracted. The video info was retrieved but the download URL could not be decrypted. This is a known issue with YouTube downloads.';
        } else if (error.message && error.message.includes('MinigetError') && (error.statusCode === 403 || error.message.includes('403'))) {
            errorMessage = 'YouTube blocked the download request. Please try again in a few minutes.';
        } else if (error.message && error.message.includes('Sign in to confirm your age')) {
            errorMessage = 'This video is age-restricted and cannot be downloaded';
        } else if (error.message && error.message.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable. It may be private, deleted, or restricted in your region';
        } else if (error.message && error.message.includes('Private video')) {
            errorMessage = 'This video is private and cannot be downloaded';
        }
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        } else {
            // If headers already sent, try to end the response
            res.end();
        }
    }
});

// Sanitize filename
function sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
}

// Static file serving - exclude /api routes explicitly
// Create static middleware
const staticFileMiddleware = express.static('.', { index: false });

// Use static middleware, but skip /api routes
app.use((req, res, next) => {
    // Skip static serving for /api routes - they're handled by route handlers above
    if (req.path.startsWith('/api/')) {
        return next();
    }
    // Serve static files for all other routes
    staticFileMiddleware(req, res, next);
});

// Handle all other GET routes - serve index.html for SPA routing
// This should come LAST, after all API routes and static middleware
app.get('*', (req, res) => {
    // Don't serve index.html for API routes - they should have been handled above
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found', method: req.method, path: req.path });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Note: Express doesn't support '/api/*' wildcard pattern
// Unmatched routes will naturally return 404
// For API routes specifically, we can add logging middleware if needed

// Start server
app.listen(PORT, () => {
    console.log(`YouTube Downloader server running on http://localhost:${PORT}`);
    console.log('Registered routes:');
    console.log('  POST /api/download');
    console.log('  POST /api/test-post');
    console.log('  GET /api/test');
    console.log('  GET /api/progress/:sessionId');
    console.log('  GET /api/mobile-download/:sessionId');
    console.log('\nServer ready to accept requests!');
});

