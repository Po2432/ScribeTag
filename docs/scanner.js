let video = document.getElementById('videoElement');
let errorText = document.getElementById('cam-error');
let stream = null;
let track = null;
let flashEnabled = false;

async function startCamera() {
    // 1. Check if the browser even allows the camera API (fails on file:// protocol)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        errorText.innerText = "Error: Camera API not supported. Are you running this on HTTP/HTTPS?";
        return;
    }

    try {
        // Try to get the back camera first
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });
        
        video.srcObject = stream;
        
        // Explicitly tell it to play (fixes iOS black screen)
        await video.play();

        track = stream.getVideoTracks()[0];
        
        // Check for flashlight capability
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
            document.getElementById('flash-btn').style.display = 'inline-block';
        }
    } catch (err) {
        // Fallback: If back camera fails, try ANY camera
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            await video.play();
        } catch (fallbackErr) {
            // Print the exact error to the screen
            errorText.innerText = `Camera Failed: ${err.name} - ${err.message}`;
        }
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

    setTimeout(() => {
        document.getElementById('scan-result').innerHTML = "<b>Example Scan Successful!</b><br>The camera is now successfully reading the feed.";
    }, 1500);
}

// Start camera when script loads
startCamera();
