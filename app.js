// State management
let selectedFormat = 'video';
let currentDownloadAbortController = null;
let currentSessionId = null;
let qrCodeInstance = null;
let currentFileBlobUrl = null;
let currentFileName = null;
let isDownloadComplete = false;

// DOM Elements - will be initialized in DOMContentLoaded
let urlInput, pasteBtn, clearBtn, videoBtn, audioBtn, downloadBtn;
let progressSection, progressText, progressBar, cancelBtn;
let qrCodeContainer, qrcodeDiv;
let viewFileSection, openDownloadsBtn, viewFileName, closeViewBtn;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    urlInput = document.getElementById('urlInput');
    pasteBtn = document.getElementById('pasteBtn');
    clearBtn = document.getElementById('clearBtn');
    videoBtn = document.getElementById('videoBtn');
    audioBtn = document.getElementById('audioBtn');
    downloadBtn = document.getElementById('downloadBtn');
    progressSection = document.getElementById('progressSection');
    progressText = document.getElementById('progressText');
    progressBar = document.getElementById('progressBar');
    cancelBtn = document.getElementById('cancelBtn');
    qrCodeContainer = document.getElementById('qrCodeContainer');
    qrcodeDiv = document.getElementById('qrcode');
    viewFileSection = document.getElementById('viewFileSection');
    openDownloadsBtn = document.getElementById('openDownloadsBtn');
    viewFileName = document.getElementById('viewFileName');
    closeViewBtn = document.getElementById('closeViewBtn');
    
    console.log('DOM elements loaded. Paste button:', pasteBtn ? 'Found' : 'NOT FOUND');
    
    setupEventListeners();
    setActiveFormat('video');
    // Initialize QR code container (always visible, but empty until download starts)
    if (qrCodeContainer) {
        qrCodeContainer.classList.remove('hidden');
    }
});

// Setup event listeners
function setupEventListeners() {
    // Check if elements exist
    if (!pasteBtn) {
        console.error('Paste button not found!');
        return;
    }
    if (!urlInput) {
        console.error('URL input not found!');
        return;
    }
    
    // Paste button - simplified and more reliable
    if (pasteBtn && urlInput) {
        pasteBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Paste button clicked - handler fired');
            
            // Always focus the input first
            urlInput.focus();
            
            // Try Clipboard API if available
            if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                try {
                    console.log('Attempting to use Clipboard API...');
                    const text = await navigator.clipboard.readText();
                    console.log('Clipboard API returned text, length:', text ? text.length : 0);
                    
                    if (text && text.trim()) {
                        // Success - paste the text
                        urlInput.value = text.trim();
                        urlInput.classList.remove('text-gray-500', 'placeholder-gray-500');
                        urlInput.classList.add('text-gray-900');
                        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
                        console.log('Successfully pasted from clipboard:', text.substring(0, 50) + '...');
                        return;
                    } else {
                        // Clipboard is empty
                        alert('No text found in clipboard. Please copy a YouTube URL first.');
                        return;
                    }
                } catch (err) {
                    console.warn('Clipboard API error:', err.name, err.message);
                    
                    // If permission denied or other error, fall back to manual paste
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        console.log('Clipboard permission denied, using manual paste fallback');
                    } else if (err.name === 'NotFoundError') {
                        alert('No text found in clipboard. Please copy a YouTube URL first.');
                        return;
                    } else {
                        console.log('Clipboard API failed, using manual paste fallback');
                    }
                    // Continue to fallback below
                }
            } else {
                console.log('Clipboard API not available, using manual paste fallback');
            }
            
            // Fallback: Focus input and guide user to paste manually
            console.log('Using fallback: input focused, waiting for manual paste');
            urlInput.select(); // Select any existing text
            
            // Update placeholder to guide user
            const originalPlaceholder = urlInput.placeholder;
            urlInput.placeholder = 'Paste with Ctrl+V (Cmd+V on Mac)...';
            
            // Listen for paste event
            const handlePaste = function(e) {
                console.log('Paste event detected in input field');
                setTimeout(() => {
                    if (urlInput.value && urlInput.value.trim()) {
                        urlInput.classList.remove('text-gray-500', 'placeholder-gray-500');
                        urlInput.classList.add('text-gray-900');
                    }
                    urlInput.placeholder = originalPlaceholder;
                }, 50);
            };
            
            urlInput.addEventListener('paste', handlePaste, { once: true });
            
            // Reset placeholder after 5 seconds
            setTimeout(() => {
                if (urlInput.placeholder === 'Paste with Ctrl+V (Cmd+V on Mac)...') {
                    urlInput.placeholder = originalPlaceholder;
                }
            }, 5000);
        });
        
        console.log('Paste button event listener attached successfully');
    } else {
        console.error('Cannot attach paste button listener - elements not found:', {
            pasteBtn: !!pasteBtn,
            urlInput: !!urlInput
        });
    }

    // Clear button
    clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        urlInput.placeholder = 'Paste YouTube video URL here...';
        urlInput.classList.add('text-gray-500', 'placeholder-gray-500');
        urlInput.classList.remove('text-gray-900');
    });

    // Format buttons
    videoBtn.addEventListener('click', () => setActiveFormat('video'));
    audioBtn.addEventListener('click', () => setActiveFormat('audio'));

    // Download button
    downloadBtn.addEventListener('click', () => {
        if (isDownloadComplete) {
            // Reset form for new download
            resetFormForNewDownload();
        } else {
            // Start download
            startDownload();
        }
    });

    // Cancel button
    cancelBtn.addEventListener('click', cancelDownload);

    // Open Downloads folder button
    if (openDownloadsBtn) {
        openDownloadsBtn.addEventListener('click', () => {
            // Try to open Downloads folder (limited browser support due to security)
            const fileName = currentFileName || 'download';
            
            // Try Chrome/Edge downloads page (won't work from web pages due to security)
            try {
                if (/Chrome|Edg/.test(navigator.userAgent)) {
                    // This usually won't work from web pages, but we'll try
                    window.location.href = 'chrome://downloads';
                    // If it doesn't work, the catch will handle it
                    return;
                }
            } catch (e) {
                // Cannot open - show simple message
            }
            
            // Show simple prompt (this will be the default behavior)
            alert(`File has been saved to your Downloads folder.\n\nFile name: ${fileName}`);
        });
    }

    // Close view section button
    if (closeViewBtn) {
        closeViewBtn.addEventListener('click', () => {
            closeViewFileSection();
        });
    }

    // URL input - Enter key
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startDownload();
        }
    });

    // URL input - Focus events
    urlInput.addEventListener('focus', () => {
        if (urlInput.value === 'Paste YouTube video URL here...' || urlInput.value === '') {
            urlInput.value = '';
            urlInput.classList.remove('text-gray-500', 'placeholder-gray-500');
            urlInput.classList.add('text-gray-900');
        }
    });

    urlInput.addEventListener('blur', () => {
        if (urlInput.value.trim() === '') {
            urlInput.value = '';
            urlInput.placeholder = 'Paste YouTube video URL here...';
            urlInput.classList.add('text-gray-500', 'placeholder-gray-500');
            urlInput.classList.remove('text-gray-900');
        }
    });
}

// Set active format
function setActiveFormat(format) {
    selectedFormat = format;
    
    if (format === 'video') {
        videoBtn.classList.remove('border-gray-300');
        videoBtn.classList.add('border-2', 'border-red-600');
        audioBtn.classList.remove('border-2', 'border-red-600');
        audioBtn.classList.add('border', 'border-gray-300');
    } else {
        audioBtn.classList.remove('border-gray-300');
        audioBtn.classList.add('border-2', 'border-red-600');
        videoBtn.classList.remove('border-2', 'border-red-600');
        videoBtn.classList.add('border', 'border-gray-300');
    }
}

// Start download
async function startDownload() {
    const url = urlInput.value.trim();
    
    if (!url || url === 'Paste YouTube video URL here...') {
        alert('Please enter a YouTube URL');
        return;
    }

    // Validate YouTube URL
    if (!isValidYouTubeUrl(url)) {
        alert('Please enter a valid YouTube URL');
        return;
    }

    // Create abort controller for cancellation
    currentDownloadAbortController = new AbortController();

    // Reset download complete state
    isDownloadComplete = false;

    // Close view file section if open
    closeViewFileSection();

    // Update download button
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Download';
    downloadBtn.classList.add('bg-gray-400');
    downloadBtn.classList.remove('bg-red-600', 'hover:bg-red-700');

    // Show progress section
    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Preparing download...';

    // Generate session ID for progress tracking
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    currentSessionId = sessionId;
    let progressInterval = null;

    // Generate and show QR code
    generateQRCode(sessionId);

    try {
        // Start progress polling
        progressInterval = setInterval(async () => {
            try {
                const progressResponse = await fetch(`/api/progress/${sessionId}`);
                if (progressResponse.ok) {
                    const contentType = progressResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const text = await progressResponse.text();
                        if (text && text.trim()) {
                            try {
                                const progress = JSON.parse(text);
                                if (progress.progress !== undefined) {
                                    progressBar.style.width = `${progress.progress}%`;
                                }
                                if (progress.message) {
                                    const title = progress.title ? ` - ${progress.title.substring(0, 40)}` : '';
                                    progressText.textContent = `${progress.message}${title}`;
                                }
                            } catch (parseError) {
                                // Invalid JSON, ignore
                            }
                        }
                    }
                }
            } catch (e) {
                // Ignore progress polling errors
            }
        }, 500);

        // Start download
        const apiEndpoint = '/api/download';
        console.log('Starting download request to:', apiEndpoint);
        console.log('Request details:', { url, format: selectedFormat, sessionId });
        console.log('Full URL will be:', window.location.origin + apiEndpoint);
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                format: selectedFormat,
                sessionId: sessionId
            }),
            signal: currentDownloadAbortController.signal
        });
        
        console.log('Response received - Status:', response.status, response.statusText);
        console.log('Response URL:', response.url);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // Clear progress polling
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }

        // Check if response is an error
        if (!response.ok) {
            let errorMessage = 'Download failed';
            try {
                // Clone response to read text without consuming the body
                const responseClone = response.clone();
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const text = await responseClone.text();
                    if (text && text.trim()) {
                        try {
                            const error = JSON.parse(text);
                            errorMessage = error.message || error.error || errorMessage;
                            console.error('Server error:', error);
                        } catch (parseError) {
                            // If JSON parsing fails, try to use text as error message
                            if (text.length < 200) {
                                errorMessage = text;
                            }
                            console.error('Error parsing error response:', parseError, text);
                        }
                    }
                } else {
                    // Not JSON, try to get status text
                    errorMessage = response.statusText || `HTTP ${response.status}`;
                }
            } catch (errorHandlingError) {
                // If we can't read the error response, use status text or default message
                errorMessage = response.statusText || `HTTP ${response.status}: Download failed`;
                console.error('Error reading error response:', errorHandlingError);
            }
            throw new Error(errorMessage);
        }

        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'download';
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename="(.+)"/);
            if (matches) {
                filename = matches[1];
            }
        }

        // Get blob from response
        let blob;
        try {
            blob = await response.blob();
            
            // Check if blob is valid
            if (!blob || blob.size === 0) {
                console.error('Downloaded blob is empty or invalid');
                throw new Error('Downloaded file is empty or invalid. Please try again.');
            }
            console.log('Downloaded blob size:', blob.size, 'bytes');
        } catch (blobError) {
            // If blob reading fails, we can't read the response again since it's already consumed
            // Use the error message from the blob reading
            console.error('Blob reading error:', blobError);
            const errorMessage = blobError.message || 'Failed to download file. The file may be corrupted or the download was interrupted.';
            throw new Error(errorMessage);
        }
        
        // Create download link
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Store blob URL for viewing (don't revoke it yet)
        if (currentFileBlobUrl) {
            // Revoke previous blob URL if exists
            window.URL.revokeObjectURL(currentFileBlobUrl);
        }
        currentFileBlobUrl = downloadUrl;
        currentFileName = filename;

        // Success
        progressBar.style.width = '100%';
        progressText.textContent = 'Download complete!';
        
        // Mark download as complete and update button
        isDownloadComplete = true;
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download another file';
        downloadBtn.classList.remove('bg-gray-400');
        downloadBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        
        // Hide progress section and show view file section
        setTimeout(() => {
            progressSection.classList.add('hidden');
            showViewFileSection(filename);
        }, 1000);

    } catch (error) {
        if (progressInterval) {
            clearInterval(progressInterval);
        }
        
        console.error('Download error caught:', error);
        
        if (error.name === 'AbortError') {
            progressText.textContent = 'Download cancelled';
            setTimeout(() => {
                resetUI();
            }, 1000);
        } else {
            // Show more detailed error message
            const errorMsg = error.message || 'An unknown error occurred. Please check the console for details.';
            console.error('Full error:', error);
            alert(`Error: ${errorMsg}`);
            resetUI();
        }
    }
}

// Cancel download
function cancelDownload() {
    if (currentDownloadAbortController) {
        currentDownloadAbortController.abort();
        currentDownloadAbortController = null;
    }
}

// Generate QR Code
function generateQRCode(sessionId) {
    // Clear existing QR code
    qrcodeDiv.innerHTML = '';

    // Create download URL for mobile
    const downloadUrl = `${window.location.origin}/api/mobile-download/${sessionId}?format=${selectedFormat}`;

    // Generate QR code using QRious
    if (typeof QRious !== 'undefined') {
        try {
            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.id = 'qrcode-canvas';
            qrcodeDiv.appendChild(canvas);
            
            qrCodeInstance = new QRious({
                element: canvas,
                value: downloadUrl,
                size: 200,
                background: 'white',
                foreground: 'black',
                level: 'H'
            });
            
            // QR code container is always visible now
        } catch (error) {
            console.error('Error generating QR code:', error);
            // Fallback: show URL as text
            qrcodeDiv.innerHTML = `<div class="text-xs text-gray-600 break-all p-2 bg-gray-100 rounded">${downloadUrl}</div>`;
        }
    } else {
        console.error('QRious library not loaded');
        // Fallback: show URL as text
        qrcodeDiv.innerHTML = `<div class="text-xs text-gray-600 break-all p-2 bg-gray-100 rounded">${downloadUrl}</div>`;
    }
}

// Show view file section
function showViewFileSection(filename) {
    if (viewFileSection && viewFileName) {
        viewFileName.textContent = `File: ${filename}`;
        viewFileSection.classList.remove('hidden');
    }
}

// Close view file section
function closeViewFileSection() {
    if (viewFileSection) {
        viewFileSection.classList.add('hidden');
    }
    // Revoke blob URL to free memory
    if (currentFileBlobUrl) {
        window.URL.revokeObjectURL(currentFileBlobUrl);
        currentFileBlobUrl = null;
        currentFileName = null;
    }
}

// Reset UI (for errors/cancellations)
function resetUI() {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Download';
    downloadBtn.classList.remove('bg-gray-400');
    downloadBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    progressSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '';
    currentDownloadAbortController = null;
    isDownloadComplete = false;
    // Close view file section when starting new download
    closeViewFileSection();
    // Keep QR code visible - it will be updated on next download
}

// Reset form for new download (called when "Download another file" is clicked)
function resetFormForNewDownload() {
    // Clear input
    if (urlInput) {
        urlInput.value = '';
        urlInput.placeholder = 'Paste YouTube video URL here...';
        urlInput.classList.add('text-gray-500', 'placeholder-gray-500');
        urlInput.classList.remove('text-gray-900');
    }
    
    // Reset button
    if (downloadBtn) {
        downloadBtn.textContent = 'Download';
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('bg-gray-400');
        downloadBtn.classList.add('bg-red-600', 'hover:bg-red-700');
    }
    
    // Reset state
    isDownloadComplete = false;
    currentDownloadAbortController = null;
    currentSessionId = null;
    
    // Hide progress and view file sections
    if (progressSection) {
        progressSection.classList.add('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '';
    }
    
    // Close view file section
    closeViewFileSection();
    
    // Clear QR code
    if (qrcodeDiv) {
        qrcodeDiv.innerHTML = '<div class="text-xs text-gray-400 p-8">Enter URL and click Download to generate QR code</div>';
    }
    
    // Focus input for new URL entry
    if (urlInput) {
        urlInput.focus();
    }
}

// Validate YouTube URL
function isValidYouTubeUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^https?:\/\/youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/www\.youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
}


