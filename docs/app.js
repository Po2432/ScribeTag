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

let currentGrid = [];
let currentStep = 0;
const COLS = 4;

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

    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload); // Naturally handles Capitals and Turkish!
    
    const headerByte = type === 'text' ? 1 : (type === 'url' ? 2 : 3);
    
    // ANCHOR is first, then Header, then Data
    currentGrid = ['ANCHOR', headerByte, ...payloadBytes];
    currentStep = 0;

    document.getElementById(`${formPrefix}-input-area`).style.display = 'none';
    document.getElementById(`wizard-container`).style.display = 'block';
    
    updateWizard();
}

function updateWizard() {
    const totalSteps = currentGrid.length;
    const byte = currentGrid[currentStep];
    const col = currentStep % COLS;

    let text = "";
    if (byte === 'ANCHOR') {
        text = "Draw your FIRST square at the top-left.<br><span style='color:var(--primary)'>Draw a large <b>X</b> inside it.</span><br><small>(This anchors the scanner)</small>";
    } else {
        const positionText = col === 0 ? "Start a NEW ROW below." : "Draw the next square to the RIGHT.";
        let shapes = getShapesForByte(byte);
        text = `${positionText}<br><span style="color:var(--primary)">Inside it, draw: <b>${shapes.length ? shapes.join(', ') : 'Leave Empty'}</b></span>`;
    }
    
    document.getElementById('instruction-text').innerHTML = `Step ${currentStep + 1} of ${totalSteps}<br><br>${text}<br><small style="color:var(--danger); font-weight:normal;">Mistake? Scribble the whole square black to skip it!</small>`;

    drawStepCanvas(byte);
    updateMinimap(totalSteps);

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

    ctx.lineWidth = 6; ctx.strokeRect(10, 10, 180, 180);

    if (byte === 'ANCHOR') {
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(170, 170); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(170, 30); ctx.lineTo(30, 170); ctx.stroke();
        return;
    }

    const bin = byte.toString(2).padStart(8, '0');
    ctx.lineWidth = 6;
    
    if (bin[0] === '1') { ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(190, 100); ctx.stroke(); }
    if (bin[1] === '1') { ctx.beginPath(); ctx.moveTo(100, 10); ctx.lineTo(100, 190); ctx.stroke(); }
    if (bin[2] === '1') { ctx.beginPath(); ctx.moveTo(10, 190); ctx.lineTo(190, 10); ctx.stroke(); }
    if (bin[3] === '1') { ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(190, 190); ctx.stroke(); }

    ctx.fillStyle = "black";
    const drawDot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI*2); ctx.fill(); };
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
    
    for (let i = 0; i < rows * COLS; i++) {
        let div = document.createElement('div');
        div.className = 'mini-cell';
        if (i === 0) div.classList.add('anchor');
        else if (i < currentStep) div.classList.add('done');
        else if (i === currentStep) div.classList.add('active');
        if (i >= totalSteps) div.style.background = "transparent";
        map.appendChild(div);
    }
}

function nextStep() {
    if (currentStep < currentGrid.length - 1) { currentStep++; updateWizard(); } 
    else { alert("Complete! You can now scan it."); location.reload(); }
}
function prevStep() { if (currentStep > 0) { currentStep--; updateWizard(); } }

function toggleForm(prefix) {
    const type = document.getElementById(`${prefix}-type`).value;
    document.querySelectorAll(`.${prefix}-group`).forEach(el => el.style.display = 'none');
    document.getElementById(`${prefix}-${type}-group`).style.display = 'block';
}

function downloadTemplate() {
    const size = 60;
    const rows = Math.ceil(currentGrid.length / COLS);
    const width = COLS * size + 20;
    const height = rows * size + 20;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="white"/>`;
        
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r * COLS + c < currentGrid.length) {
                svg += `<rect x="${c*size + 10}" y="${r*size + 10}" width="${size}" height="${size}" fill="none" stroke="black" stroke-width="2"/>`;
            }
        }
    }
    svg += `</svg>`;
    
    const blob = new Blob([svg], {type: "image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "ScribeGrid-Template.svg";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
