# Secure Password Manager

A secure, local-only browser extension for managing passwords. All data is encrypted using AES-256-GCM and stored locally in your browser, ensuring your passwords never leave your device.

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
- **Encryption**: 
  - AES-256-GCM for data encryption
  - PBKDF2 for key derivation
  - Secure random number generation for cryptographic operations

## Features

### Security
- Strong encryption using AES-256-GCM
- Password-based key derivation using PBKDF2 (250,000 iterations)
- Auto-lock after 15 minutes of inactivity
- Local-only storage - no cloud sync or external servers

### Password Management
- Store website credentials securely
- Search and filter saved passwords
- Auto-fill website URL from active tab
- Copy passwords to clipboard
- Delete credentials

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

- All sensitive data is encrypted using AES-256-GCM before storage
- Master password never stored, only used for key derivation
- Encryption/decryption happens locally in memory
- Auto-lock feature prevents unauthorized access
- Uses browser's Crypto API for secure random number generation
