/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

let video = document.getElementById('videoElement');
let stream = null;
let track = null;
let flashEnabled = false;

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        video.srcObject = stream;
        track = stream.getVideoTracks()[0];
        
        // Check if device supports flash
        const capabilities = track.getCapabilities();
        if (!capabilities.torch) {
            document.getElementById('flash-btn').style.display = 'none';
        }
    } catch (err) {
        alert("Camera access required.");
    }
}

async function toggleFlash() {
    if (!track) return;
    flashEnabled = !flashEnabled;
    try {
        await track.applyConstraints({ advanced: [{ torch: flashEnabled }] });
    } catch (err) {
        alert("Could not activate flashlight.");
    }
}

function executeScan() {
    document.getElementById('scan-result').style.display = "block";
    document.getElementById('scan-result').innerText = "Processing image zones... please wait.";

    // [ARCHITECTURE FOR OPENCV GRID PROCESSING]
    // 1. Capture current frame to Canvas.
    // 2. OpenCV cv.findContours to locate the squares.
    // 3. Sort squares top-to-bottom, left-to-right based on bounding box (y/x coordinates).
    // 4. Process each square using Zonal Density (Imperfection Tolerance).
    
    /* 
      --- MISTAKE & ZONE TOLERANCE LOGIC ---
      For each extracted square image crop:
      
      let darkPixels = countDarkPixels(squareCrop);
      let totalPixels = squareCrop.width * squareCrop.height;
      
      // If the user scribbled the square out (Mistake)
      if (darkPixels / totalPixels > 0.70) {
          console.log("Square skipped (Mistake/Scribble detected)");
          continue; 
      }
      
      // Zonal Tolerance Logic (Checking regions instead of perfect lines):
      let bit0 = regionDensity(squareCrop, 'mid-horizontal') > threshold ? 1 : 0;
      let bit1 = regionDensity(squareCrop, 'mid-vertical') > threshold ? 1 : 0;
      let bit4 = regionDensity(squareCrop, 'top-left-corner') > threshold ? 1 : 0;
      ... etc.
    */

    // Simulated successful scan delay to demonstrate UI flow:
    setTimeout(() => {
        document.getElementById('scan-result').innerHTML = "<b>Example Scan Successful!</b><br>Because OpenCV.js is omitted to keep the app lightweight/Zero-Backend, this validates the camera, flash, and UI layout.<br><br><i>To read real ink, cv.findContours is required.</i>";
    }, 1500);
}

startCamera();
