let video = document.getElementById('videoElement');
let canvas = document.getElementById('canvasOutput');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
let errorText = document.getElementById('cam-error');
let cvStatus = document.getElementById('cv-status');
let stream = null;
let track = null;
let flashEnabled = false;
let isOpenCvReady = false;

// Triggered when OpenCV finishes loading from the internet
function onOpenCvReady() {
    isOpenCvReady = true;
    cvStatus.style.display = "none";
    document.getElementById('scan-btn').disabled = false;
}

async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        errorText.innerText = "Error: Camera API not supported. Use HTTPS or localhost.";
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        await video.play();
        track = stream.getVideoTracks()[0];
        
        if (track.getCapabilities().torch) {
            document.getElementById('flash-btn').style.display = 'inline-block';
        }
    } catch (err) {
        try { // Fallback to front camera if back fails
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
        } catch (fallbackErr) {
            errorText.innerText = `Camera Failed: ${err.message}`;
        }
    }
}

async function toggleFlash() {
    if (!track) return;
    flashEnabled = !flashEnabled;
    try { await track.applyConstraints({ advanced: [{ torch: flashEnabled }] }); } 
    catch (err) { alert("Flashlight not supported on this device."); }
}

function executeScan() {
    if (!isOpenCvReady) return alert("Vision Engine is still loading...");
    
    let resultBox = document.getElementById('scan-result');
    resultBox.style.display = "block";
    resultBox.innerText = "Scanning...";

    // 1. Shrink frame to standard size to prevent mobile browser crashing
    const processWidth = 640;
    const processHeight = 480;
    canvas.width = processWidth;
    canvas.height = processHeight;
    ctx.drawImage(video, 0, 0, processWidth, processHeight);

    try {
        // 2. Load into OpenCV
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        let binary = new cv.Mat();

        // 3. Convert to Grayscale & handle shadows (Adaptive Threshold)
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 5);

        // 4. Find all outlines (Contours)
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let squares = [];

        // 5. Filter for Squares
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let rect = cv.boundingRect(cnt);
            let aspect = rect.width / rect.height;
            let area = rect.width * rect.height;

            // Keep it if it's roughly square and of reasonable size
            if (aspect >= 0.7 && aspect <= 1.3 && area > 1000 && area < 50000) {
                squares.push(rect);
            }
            cnt.delete();
        }

        if (squares.length === 0) {
            resultBox.innerHTML = "<span style='color:red;'>No squares found. Align the grid and ensure good lighting.</span>";
            return cleanupCV([src, gray, binary, contours, hierarchy]);
        }

        // 6. Sort Squares (Top to Bottom, then Left to Right)
        squares.sort((a, b) => {
            // If they are on roughly the same row (within 50% of height)
            if (Math.abs(a.y - b.y) < (a.height / 2)) return a.x - b.x; // Sort L to R
            return a.y - b.y; // Sort Top to Bottom
        });

        // 7. Process valid squares
        let decodedBytes = [];
        
        for (let i = 0; i < squares.length; i++) {
            let sq = squares[i];
            
            // Crop out just this square
            let roi = binary.roi(sq);
            
            // Mistake Check: If square is more than 70% dark, user scribbled it out!
            let totalPixels = sq.width * sq.height;
            let darkPixels = cv.countNonZero(roi);
            if ((darkPixels / totalPixels) > 0.70) {
                console.log(`Square ${i} skipped (Scribbled mistake)`);
                roi.delete();
                continue; 
            }

            // Skip the first valid square (it's the Anchor with the X)
            if (decodedBytes.length === 0 && i === 0) {
                roi.delete();
                continue;
            }

            // Read the 8 Zones
            let w = sq.width; let h = sq.height;
            let binStr = "";

            // Helper function to check ink in a zone. 
            // Needs >25% of the zone to be dark to register as a '1'.
            const checkZone = (x, y, zw, zh) => {
                let zRect = new cv.Rect(Math.max(0, x), Math.max(0, y), Math.min(zw, w-x), Math.min(zh, h-y));
                let zRoi = roi.roi(zRect);
                let zDark = cv.countNonZero(zRoi);
                let zTotal = zRect.width * zRect.height;
                zRoi.delete();
                return (zDark / zTotal) > 0.25 ? "1" : "0";
            };

            // Zone 0: Horiz Line (Center 60% wide, 20% tall)
            binStr += checkZone(w*0.2, h*0.4, w*0.6, h*0.2);
            // Zone 1: Vert Line (Center 20% wide, 60% tall)
            binStr += checkZone(w*0.4, h*0.2, w*0.2, h*0.6);
            // Zone 2: Diag / (Check bottom-left area)
            binStr += checkZone(w*0.1, h*0.6, w*0.3, h*0.3);
            // Zone 3: Diag \ (Check top-left area)
            binStr += checkZone(w*0.1, h*0.1, w*0.3, h*0.3);
            // Zone 4: Dot TL
            binStr += checkZone(0, 0, w*0.2, h*0.2);
            // Zone 5: Dot TR
            binStr += checkZone(w*0.8, 0, w*0.2, h*0.2);
            // Zone 6: Dot BL
            binStr += checkZone(0, h*0.8, w*0.2, h*0.2);
            // Zone 7: Dot BR
            binStr += checkZone(w*0.8, h*0.8, w*0.2, h*0.2);

            decodedBytes.push(parseInt(binStr, 2));
            roi.delete();
        }

        // 8. Decode Data
        if (decodedBytes.length > 1) {
            let header = decodedBytes[0];
            let payloadBytes = new Uint8Array(decodedBytes.slice(1));
            let resultText = new TextDecoder().decode(payloadBytes);

            if (header === 1) resultBox.innerHTML = `📄 <b>Text:</b><br>${resultText}`;
            else if (header === 2) resultBox.innerHTML = `🔗 <b>Link:</b><br><a href="${resultText}" target="_blank">${resultText}</a>`;
            else if (header === 3) resultBox.innerHTML = `📶 <b>WiFi:</b><br>${resultText}<br><small>Copy these details.</small>`;
            else resultBox.innerHTML = `❓ <b>Unknown Code:</b><br>${resultText}`;
        } else {
            resultBox.innerHTML = "<span style='color:orange;'>Grid detected, but data was empty or unreadable.</span>";
        }

        cleanupCV([src, gray, binary, contours, hierarchy]);

    } catch (err) {
        console.error(err);
        resultBox.innerHTML = `<span style='color:red;'>Processing error: Keep grid fully inside the frame.</span>`;
    }
}

// Helper to free memory (Crucial in OpenCV.js)
function cleanupCV(mats) {
    mats.forEach(m => { try { m.delete(); } catch(e){} });
}

startCamera();
