/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

let video = document.getElementById('videoElement');
let canvas = document.getElementById('canvasOutput');
let ctx = canvas.getContext('2d', { willReadFrequently: true });
let isScanning = false;

// Triggered when the OpenCV library finishes downloading
function onOpenCvReady() {
    document.getElementById('status').innerText = "Engine loaded. Align tag with laser.";
    startCamera();
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: 640, height: 480 }
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            isScanning = true;
            requestAnimationFrame(processFrame);
        };
    } catch (err) {
        document.getElementById('status').innerText = "Camera access denied.";
        document.getElementById('status').style.color = "red";
    }
}

function processFrame() {
    if (!isScanning) return;

    // Draw video frame to hidden canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
        // Read image into OpenCV format
        let src = cv.imread(canvas);
        let gray = new cv.Mat();
        
        // Convert to grayscale and blur to smooth out hand-shaking
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        let ksize = new cv.Size(5, 5);
        cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);

        // Detect Circles using Hough Transform
        let circles = new cv.Mat();
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 45, 100, 30, 15, 60);

        if (circles.cols > 0) {
            let nodes = [];
            // Extract circle coordinates
            for (let i = 0; i < circles.cols; ++i) {
                let x = circles.data32F[i * 3];
                let y = circles.data32F[i * 3 + 1];
                let r = circles.data32F[i * 3 + 2];
                nodes.push({x, y, r});
            }

            // Sort nodes from Left to Right (Very important for sequencing!)
            nodes.sort((a, b) => a.x - b.x);

            // Decode the data from the sorted nodes
            decodeScribeTag(nodes, gray);
        }

        // Cleanup memory (Critical in OpenCV.js otherwise browser crashes)
        src.delete();
        gray.delete();
        circles.delete();

    } catch (err) {
        console.error("Vision Error: ", err);
    }

    // Process next frame
    setTimeout(() => requestAnimationFrame(processFrame), 500); // 2 frames per second
}

function decodeScribeTag(nodes, grayImage) {
    let bytes = [];
    const angles = [-Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4];

    nodes.forEach(node => {
        let binaryString = "";
        
        // Look in all 8 directions from the center of the circle
        for (let i = 0; i < 8; i++) {
            // Check pixel intensity halfway between center and radius
            let targetX = Math.round(node.x + Math.cos(angles[i]) * (node.r * 0.6));
            let targetY = Math.round(node.y + Math.sin(angles[i]) * (node.r * 0.6));
            
            // Ensure within image bounds
            if (targetX >= 0 && targetY >= 0 && targetX < grayImage.cols && targetY < grayImage.rows) {
                // Get pixel value (0 is black, 255 is white)
                let pixelValue = grayImage.ucharPtr(targetY, targetX)[0];
                
                // If it's dark (ink), it's a 1 bit. If it's light (paper), it's a 0 bit.
                binaryString += (pixelValue < 120) ? "1" : "0";
            } else {
                binaryString += "0";
            }
        }
        
        // Convert binary string to a decimal byte
        bytes.push(parseInt(binaryString, 2));
    });

    handleDecodedData(bytes);
}

function handleDecodedData(bytes) {
    if (bytes.length < 2) return; // Needs at least Header + 1 Data byte

    const header = bytes[0];
    const dataBytes = new Uint8Array(bytes.slice(1));
    
    // Convert bytes back to string (Supports Turkish characters via UTF-8)
    const decoder = new TextDecoder();
    const resultString = decoder.decode(dataBytes);

    const resultBox = document.getElementById('scan-result');
    resultBox.style.display = "block";

    if (header === 1) { // Text
        resultBox.innerHTML = `<b>Text Found:</b><br>${resultString}`;
    } else if (header === 2) { // URL
        resultBox.innerHTML = `<b>Link Found:</b><br><a href="${resultString}" target="_blank">${resultString}</a>`;
    } else if (header === 3) { // WiFi
        resultBox.innerHTML = `<b>WiFi Config Found:</b><br>${resultString}<br><i>(Copy these details to connect)</i>`;
    }
}
