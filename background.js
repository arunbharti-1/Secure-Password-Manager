importScripts('crypto.js', 'storage.js');

let masterKey = null;
let vault = []; // In-memory decrypted vault
const LOCK_TIMEOUT_MINUTES = 15;

// --- State Management ---
function lock() {
    masterKey = null;
    vault = [];
    console.log('Vault locked.');
}

function isUnlocked() {
    return !!masterKey;
}

// Auto-lock alarm
chrome.alarms.create('vault-auto-lock', {
    delayInMinutes: LOCK_TIMEOUT_MINUTES
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'vault-auto-lock') {
        lock();
    }
});

// Reset alarm on any user interaction with the extension
function resetLockTimeout() {
    chrome.alarms.create('vault-auto-lock', {
        delayInMinutes: LOCK_TIMEOUT_MINUTES
    });
}

// --- Message Handling ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Any message resets the lock timeout
    if (isUnlocked()) {
        resetLockTimeout();
    }
    
    // Using a switch for cleaner routing
    switch (request.type) {
        case 'getStatus':
            sendResponse({ isUnlocked: isUnlocked() });
            break;
            
        case 'unlock':
            handleUnlock(request, sendResponse);
            return true; // Indicates async response

        case 'lock':
            lock();
            sendResponse({ success: true });
            break;

        case 'getCredentials':
            handleGetCredentials(sendResponse);
            break;

        case 'addCredential':
            handleAddCredential(request, sendResponse);
            return true; // Indicates async response

        case 'deleteCredential':
            handleDeleteCredential(request, sendResponse);
            return true; // Indicates async response

        case 'generatePassword':
            handleGeneratePassword(request, sendResponse);
            break;
    }
    
    // Return true for async operations to keep the message channel open
    return false;
});


// --- Handler Functions ---

async function handleUnlock(request, sendResponse) {
    try {
        const storedData = await getVaultFromStorage();
        if (storedData) {
            // Vault exists, try to decrypt
            const key = await deriveKey(request.password, storedData.salt);
            const decryptedVault = await decrypt(storedData.encryptedData, key, storedData.iv);
            
            masterKey = key;
            vault = JSON.parse(decryptedVault);
            console.log('Vault unlocked successfully.');
            sendResponse({ success: true });
        } else {
            // No vault exists, create a new one
            const salt = generateSalt();
            const key = await deriveKey(request.password, salt);
            
            masterKey = key;
            vault = []; // Start with an empty vault
            
            const { encryptedData, iv } = await encrypt(JSON.stringify(vault), masterKey);
            await saveVaultToStorage({ encryptedData, salt, iv });
            
            console.log('New vault created and unlocked.');
            sendResponse({ success: true });
        }
    } catch (error) {
        console.error('Unlock failed:', error);
        lock(); // Ensure vault is locked on failure
        sendResponse({ success: false, error: 'Invalid master password.' });
    }
}


function handleGetCredentials(sendResponse) {
    if (!isUnlocked()) {
        sendResponse({ success: false, error: 'Vault is locked.' });
        return;
    }
    sendResponse({ success: true, credentials: vault });
}


async function handleAddCredential(request, sendResponse) {
    if (!isUnlocked()) {
        sendResponse({ success: false, error: 'Vault is locked.' });
        return;
    }
    
    const newCredential = {
        ...request.credential,
        id: self.crypto.randomUUID()
    };
    vault.push(newCredential);
    
    try {
        await persistVault();
        sendResponse({ success: true });
    } catch (error) {
        console.error('Failed to save new credential:', error);
        // Attempt to roll back the in-memory change
        vault = vault.filter(c => c.id !== newCredential.id);
        sendResponse({ success: false, error: 'Failed to save to storage.' });
    }
}

async function handleDeleteCredential(request, sendResponse) {
    if (!isUnlocked()) {
        sendResponse({ success: false, error: 'Vault is locked.' });
        return;
    }
    
    vault = vault.filter(c => c.id !== request.id);

    try {
        await persistVault();
        sendResponse({ success: true });
    } catch (error) {
        console.error('Failed to delete credential:', error);
        // This is harder to roll back, but we should log it
        sendResponse({ success: false, error: 'Failed to save changes.' });
    }
}

function handleGeneratePassword(request, sendResponse) {
     try {
        const password = generatePasswordWithOptions(request.options);
        sendResponse({ success: true, password: password });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

// --- Utility Functions ---

async function persistVault() {
    if (!isUnlocked()) {
        throw new Error('Cannot persist vault, it is locked.');
    }
    
    const storedData = await getVaultFromStorage(); // We need the original salt
    if (!storedData || !storedData.salt) {
        throw new Error('Cannot persist vault, salt not found.');
    }

    const { encryptedData, iv } = await encrypt(JSON.stringify(vault), masterKey);
    await saveVaultToStorage({ encryptedData, salt: storedData.salt, iv });
    console.log('Vault persisted to storage.');
}

