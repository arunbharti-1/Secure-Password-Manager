# Secure Password Manager

A privacy-first, local-only browser extension for managing passwords. Everything is encrypted on your device with AES-256-GCM and stored in IndexedDB—your data never leaves your browser.

## Quick Setup

1. Clone or download this repository:
```bash
https://github.com/arunbharti-1/Secure-Password-Manager.git
```

2. Open Chrome/Edge browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`

3. Enable "Developer mode" in the top-right corner

4. Click "Load unpacked" and select the project folder

The extension should now appear in your browser toolbar!

## Tech Stack

- **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
- **Storage**: IndexedDB (Local Storage)
- **Crypto**: 
  - AES-256-GCM for data encryption
  - PBKDF2 for key derivation
  - Secure random number generation for cryptographic operations

## Features

### Security
- AES-256-GCM encryption
- Password-based key derivation using PBKDF2 (250,000 iterations)
- Auto-lock after 15 minutes of inactivity
- No cloud sync, no external servers—zero plaintext at rest
### Password Management
- Securely store website credentials
- Fast search & filter
- Auto-fill website URL from active tab
- Copy passwords to clipboard
- Edit/Delete entries

### Password Generator
- Generate strong passwords with customizable options:
  - Adjustable length (8-64 characters)
  - Include uppercase letters
  - Include lowercase letters
  - Include numbers
  - Include special symbols

### User Interface
- Clean, modern interface
- Dark/Light theme toggle
- Responsive design
- Toast notifications for actions
- Tab-based navigation

## Security Model

- Before storage: Each item is encrypted with AES-256-GCM using a fresh random IV; the auth tag is verified on decrypt.
- Master password: Never stored. A unique salt + PBKDF2-HMAC-SHA-256 (250k) derive your vault key locally.
- Runtime: Encryption/decryption happens in memory via the Web Crypto API.
- Randomness: Salts/IVs and generator output use crypto.getRandomValues.
