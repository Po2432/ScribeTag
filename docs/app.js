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

// ScribeGrid - Step-by-Step Engine
let currentGrid = [];
let currentStep = 0;
const COLS = 4; // 4 squares per row

function generateScribeTag(formPrefix) {
    const type = document.getElementById(`${formPrefix}-type`).value;
    let payload = "";

    if (type === 'text') payload = document.getElementById(`${formPrefix}-text`).value;
    else if (type === 'url') payload = document.getElementById(`${formPrefix}-url`).value;
    else if (type === 'wifi') {
        const ssid = document.getElementById(`${formPrefix}-ssid`).value;
        const pass = document.getElementById(`${formPrefix}-pass`).value;
        payload = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
    }

    if (!payload) return alert("Please enter data.");

    // Encode text to bytes (Supports Turkish)
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);
    
    // Header byte identifies type (1=Text, 2=URL, 3=WiFi)
    const headerByte = type === 'text' ? 1 : (type === 'url' ? 2 : 3);
    
    // Build array: Anchor (special), Header, then Data
    currentGrid = ['ANCHOR', headerByte, ...payloadBytes];
    currentStep = 0;

    document.getElementById(`${formPrefix}-input-area`).style.display = 'none';
    document.getElementById(`wizard-container`).style.display = 'block';
    
    updateWizard();
}

function updateWizard() {
    const totalSteps = currentGrid.length;
    const byte = currentGrid[currentStep];
    const row = Math.floor(currentStep / COLS);
    const col = currentStep % COLS;

    // 1. Update Text Instruction
    let text = "";
    if (byte === 'ANCHOR') {
        text = "Draw a square at the TOP-LEFT.<br>Draw a smaller square inside it (Anchor).";
    } else {
        const positionText = col === 0 
            ? "Start a NEW ROW below. Draw a square." 
            : "Draw a square attached to the RIGHT.";
        
        let shapes = getShapesForByte(byte);
        text = `${positionText}<br><br><span style="color:var(--primary)">Inside it, draw: <b>${shapes.length ? shapes.join(', ') : 'Leave Empty'}</b></span>`;
    }
    document.getElementById('instruction-text').innerHTML = `Step ${currentStep + 1} of ${totalSteps}<br><br>${text}`;

    // 2. Draw the large single square on Canvas
    drawStepCanvas(byte);

    // 3. Update Minimap
    updateMinimap(totalSteps);

    // 4. Update Buttons
    document.getElementById('btn-prev').disabled = currentStep === 0;
    document.getElementById('btn-next').innerText = currentStep === totalSteps - 1 ? "Finish" : "Next Step >";
}

function getShapesForByte(byte) {
    const bin = byte.toString(2).padStart(8, '0');
    const shapes = [];
    if (bin[0] === '1') shapes.push("Horizontal Line (-)");
    if (bin[1] === '1') shapes.push("Vertical Line (|)");
    if (bin[2] === '1') shapes.push("Diagonal (/)");
    if (bin[3] === '1') shapes.push("Diagonal (\\)");
    if (bin[4] === '1') shapes.push("Dot Top-Left");
    if (bin[5] === '1') shapes.push("Dot Top-Right");
    if (bin[6] === '1') shapes.push("Dot Bottom-Left");
    if (bin[7] === '1') shapes.push("Dot Bottom-Right");
    return shapes;
}

function drawStepCanvas(byte) {
    const cvs = document.getElementById('step-canvas');
    const ctx = cvs.getContext('2d');
    cvs.width = 200; cvs.height = 200;
    ctx.clearRect(0,0,200,200);

    // Outline
    ctx.lineWidth = 6; ctx.strokeRect(10, 10, 180, 180);

    if (byte === 'ANCHOR') {
        ctx.strokeRect(50, 50, 100, 100);
        return;
    }

    const bin = byte.toString(2).padStart(8, '0');
    ctx.lineWidth = 4;
    
    // Lines
    if (bin[0] === '1') { ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(190, 100); ctx.stroke(); }
    if (bin[1] === '1') { ctx.beginPath(); ctx.moveTo(100, 10); ctx.lineTo(100, 190); ctx.stroke(); }
    if (bin[2] === '1') { ctx.beginPath(); ctx.moveTo(10, 190); ctx.lineTo(190, 10); ctx.stroke(); }
    if (bin[3] === '1') { ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(190, 190); ctx.stroke(); }

    // Dots
    ctx.fillStyle = "black";
    const drawDot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2); ctx.fill(); };
    if (bin[4] === '1') drawDot(40, 40);
    if (bin[5] === '1') drawDot(160, 40);
    if (bin[6] === '1') drawDot(40, 160);
    if (bin[7] === '1') drawDot(160, 160);
}

function updateMinimap(totalSteps) {
    const map = document.getElementById('minimap');
    map.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    map.innerHTML = '';
    
    const rows = Math.ceil(totalSteps / COLS);
    const totalCells = rows * COLS;

    for (let i = 0; i < totalCells; i++) {
        let div = document.createElement('div');
        div.className = 'mini-cell';
        if (i === 0) div.classList.add('anchor');
        else if (i < currentStep) div.classList.add('done');
        else if (i === currentStep) div.classList.add('active');
        
        // Hide unused cells in the last row
        if (i >= totalSteps) div.style.background = "transparent";
        map.appendChild(div);
    }
}

function nextStep() {
    if (currentStep < currentGrid.length - 1) {
        currentStep++; updateWizard();
    } else {
        alert("Grid Complete! You can now scan it.");
        location.reload();
    }
}
function prevStep() {
    if (currentStep > 0) { currentStep--; updateWizard(); }
}

function toggleForm(prefix) {
    const type = document.getElementById(`${prefix}-type`).value;
    document.querySelectorAll(`.${prefix}-group`).forEach(el => el.style.display = 'none');
    document.getElementById(`${prefix}-${type}-group`).style.display = 'block';
}
