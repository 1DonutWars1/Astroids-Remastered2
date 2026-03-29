// ============================================================
//  ANTI-PIRACY PROTECTIONS
// ============================================================

// Disable right-click
document.addEventListener('contextmenu', e => e.preventDefault());

// Block common devtools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
document.addEventListener('keydown', function(e) {
    if(e.key==='F12') { e.preventDefault(); return; }
    if(e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
    if(e.ctrlKey && e.key.toUpperCase()==='U') { e.preventDefault(); return; }
});

// License key validation
const LICENSE_STORAGE = 'ast_rem_license';
const WATERMARK_STORAGE = 'ast_rem_wm_id';

function validateLicenseKey(raw) {
    // Format: ASTR-XXXX-XXXX-XXXX (last 4 is hex checksum)
    const key = raw.trim().toUpperCase();
    if (!/^ASTR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return false;
    const parts = key.split('-');
    const p1 = parts[1], p2 = parts[2], provided = parts[3];
    let checksum = 0;
    const mid = p1 + p2;
    for (let i = 0; i < mid.length; i++) checksum = (checksum * 31 + mid.charCodeAt(i)) & 0xFFFF;
    const expected = checksum.toString(16).toUpperCase().padStart(4, '0');
    return provided === expected;
}

function deriveWatermarkId(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) & 0xFFFFFFFF;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function applyWatermark() {
    const wmId = localStorage.getItem(WATERMARK_STORAGE);
    if (wmId) {
        window._watermarkId = wmId;
        document.getElementById('watermark').textContent = 'ID:' + wmId;
    }
}

function checkExistingLicense() {
    const stored = localStorage.getItem(LICENSE_STORAGE);
    if (stored && validateLicenseKey(stored)) {
        applyWatermark();
        return true;
    }
    return false;
}

function validateLicense() {
    const input = document.getElementById('licenseInput').value;
    const errEl = document.getElementById('licenseError');
    if (!validateLicenseKey(input)) {
        errEl.textContent = 'Invalid license key. Check format: ASTR-XXXX-XXXX-XXXX';
        return;
    }
    // Valid — store and proceed
    localStorage.setItem(LICENSE_STORAGE, input.trim().toUpperCase());
    const wmId = deriveWatermarkId(input);
    localStorage.setItem(WATERMARK_STORAGE, wmId);
    applyWatermark();
    document.getElementById('licenseScreen').style.display = 'none';
    document.getElementById('menuScreen').style.display = 'block';
    errEl.textContent = '';
}

// Allow Enter key to submit license
document.addEventListener('DOMContentLoaded', () => {
    const li = document.getElementById('licenseInput');
    if (li) li.addEventListener('keydown', e => { if (e.key === 'Enter') validateLicense(); });
});

