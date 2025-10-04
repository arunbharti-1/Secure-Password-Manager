// --- Key Derivation (PBKDF2) ---
const ITERATIONS = 250000;
const KEY_LENGTH = 32; // 32 bytes = 256 bits for AES-256
const HASH_ALGORITHM = 'SHA-256';

// Generates a random salt for key derivation
function generateSalt(size = 16) {
    return self.crypto.getRandomValues(new Uint8Array(size));
}

// Derives a key from a password and salt
async function deriveKey(password, salt) {
    const passwordBuffer = new TextEncoder().encode(password);
    const importedKey = await self.crypto.subtle.importKey(
        'raw',
        passwordBuffer, { name: 'PBKDF2' },
        false, ['deriveBits', 'deriveKey']
    );

    return self.crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: HASH_ALGORITHM
        },
        importedKey, { name: 'AES-GCM', length: 256 },
        true, ['encrypt', 'decrypt']
    );
}

// --- Encryption/Decryption (AES-256-GCM) ---
const IV_LENGTH = 12; // 12 bytes = 96 bits, recommended for GCM

// Encrypts data with the derived key
async function encrypt(data, key) {
    const iv = self.crypto.getRandomValues(new Uint8Array(IV_LENGTH)); // Corrected: Uint8Array
    const dataBuffer = new TextEncoder().encode(data);

    const encryptedData = await self.crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: iv
        },
        key,
        dataBuffer
    );
    return { encryptedData, iv };
}

// Decrypts data with the derived key
async function decrypt(encryptedData, key, iv) {
    const decryptedBuffer = await self.crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encryptedData
    );
    return new TextDecoder().decode(decryptedBuffer);
}

// --- Password Generation ---
const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function generatePasswordWithOptions(options) {
    let charset = '';
    let password = '';
    
    if (options.uppercase) charset += CHAR_SETS.uppercase;
    if (options.lowercase) charset += CHAR_SETS.lowercase;
    if (options.numbers) charset += CHAR_SETS.numbers;
    if (options.symbols) charset += CHAR_SETS.symbols;

    if (charset.length === 0) {
        throw new Error("At least one character set must be selected.");
    }

    // Ensure at least one character from each selected set
    if (options.uppercase) password += CHAR_SETS.uppercase[self.crypto.getRandomValues(new Uint8Array(1))[0] % CHAR_SETS.uppercase.length];
    if (options.lowercase) password += CHAR_SETS.lowercase[self.crypto.getRandomValues(new Uint8Array(1))[0] % CHAR_SETS.lowercase.length];
    if (options.numbers) password += CHAR_SETS.numbers[self.crypto.getRandomValues(new Uint8Array(1))[0] % CHAR_SETS.numbers.length];
    if (options.symbols) password += CHAR_SETS.symbols[self.crypto.getRandomValues(new Uint8Array(1))[0] % CHAR_SETS.symbols.length];

    const remainingLength = options.length - password.length;
    if (remainingLength > 0) {
        const randomBytes = self.crypto.getRandomValues(new Uint8Array(remainingLength));
        for (let i = 0; i < remainingLength; i++) {
            const randomIndex = randomBytes[i] % charset.length;
            password += charset[randomIndex];
        }
    }
    
    // Shuffle the password to randomize the positions of the guaranteed characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

