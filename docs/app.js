/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

/*
 * Copyright (c) 2026 po2432
 * Repository: https://github.com/Po2432/ScribeTag
 */

// ScribeTag Core Encoding and Drawing Engine

function generateScribeTag(formId, canvasId, instructionsId) {
    const type = document.getElementById(formId + '-type').value;
    let payload = "";

    // Format data based on selected type
    if (type === 'text') {
        payload = document.getElementById(formId + '-text').value;
    } else if (type === 'url') {
        payload = document.getElementById(formId + '-url').value;
        if (!payload.startsWith('http')) payload = 'https://' + payload;
    } else if (type === 'wifi') {
        const ssid = document.getElementById(formId + '-ssid').value;
        const pass = document.getElementById(formId + '-pass').value;
        payload = `WIFI:T:WPA;S:${ssid};P:${pass};;`; // Standard WiFi String
    }

    if (!payload) return alert("Please enter data to encode.");

    // Convert to UTF-8 Bytes (Supports Turkish / all ASCII perfectly)
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);

    // Create ScribeTag Array: [Header Byte] + [Payload Bytes]
    // Header: 1 = Text, 2 = URL, 3 = WiFi
    const headerByte = type === 'text' ? 1 : (type === 'url' ? 2 : 3);
    const totalBytes = new Uint8Array(payloadBytes.length + 1);
    totalBytes[0] = headerByte;
    totalBytes.set(payloadBytes, 1);

    drawTag(totalBytes, canvasId);
    writeInstructions(totalBytes, instructionsId, type);
}

function drawTag(bytes, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    const nodeSpacing = 100;
    const padding = 50;
    canvas.width = (bytes.length * nodeSpacing) + padding;
    canvas.height = 200;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Spine
    ctx.beginPath();
    ctx.moveTo(padding, 100);
    ctx.lineTo(padding + (bytes.length * nodeSpacing) - nodeSpacing, 100);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    // Draw Nodes
    bytes.forEach((byte, i) => {
        const cx = padding + (i * nodeSpacing);
        const cy = 100;
        const radius = 35;

        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.lineWidth = 2; ctx.stroke();

        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = "#000"; ctx.fill();

        // Draw Bits (8 directions)
        const bin = byte.toString(2).padStart(8, '0');
        const angles = [-Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, -3*Math.PI/4];

        for (let j = 0; j < 8; j++) {
            if (bin[j] === '1') {
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angles[j]) * radius, cy + Math.sin(angles[j]) * radius);
                ctx.lineWidth = 3; ctx.stroke();
            }
        }
    });
}

function writeInstructions(bytes, divId, type) {
    const div = document.getElementById(divId);
    const dirs = ["Top", "Top-Right", "Right", "Bottom-Right", "Bottom", "Bottom-Left", "Left", "Top-Left"];
    
    let html = `<h3>How to Draw Your ScribeTag</h3>
                <p><b>1.</b> Draw a long horizontal line.</p>
                <p><b>2.</b> Draw <b>${bytes.length}</b> circles along the line.</p>
                <p><b>3.</b> Draw lines from the center dot of each circle pointing in these directions:</p>
                <ol>`;

    bytes.forEach((byte, i) => {
        const bin = byte.toString(2).padStart(8, '0');
        let active = [];
        for (let j = 0; j < 8; j++) if (bin[j] === '1') active.push(`<b>${dirs[j]}</b>`);
        
        let note = i === 0 ? ` <i>(Identifies as ${type.toUpperCase()})</i>` : "";
        html += `<li><b>Circle ${i + 1}:</b> ${active.length ? active.join(', ') : 'None'}${note}</li>`;
    });

    html += `</ol>`;
    div.innerHTML = html;
}

// UI toggle for form types
function toggleForm(formId) {
    const type = document.getElementById(formId + '-type').value;
    document.querySelectorAll('.' + formId + '-group').forEach(el => el.style.display = 'none');
    document.getElementById(formId + '-' + type + '-group').style.display = 'block';
}
