/**
 * ASTEROIDS REMASTERED — DEV KEY
 * Authorized developer access only.
 * This file contains a signed token verified by the game.
 * Creating a fake devkey.js will not work without the correct signature.
 */

(function() {
    // Signed token — game verifies this against its internal key
    const SIGNATURE = 'AST-REM-DEV-a7f3bc91e24d';
    const TIMESTAMP = 1711584000000; // encoded auth timestamp
    const CHECKSUM = ((SIGNATURE.length * 7) + (TIMESTAMP % 9973)) ^ 0xBEEF;

    window._DEVKEY_PAYLOAD = {
        sig: SIGNATURE,
        ts: TIMESTAMP,
        cs: CHECKSUM,
        v: 2
    };

    console.log('[DEVKEY] Key loaded — awaiting verification...');
})();
