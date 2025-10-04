// --- contents of secure-password-manager/popup.js ---

document.addEventListener('DOMContentLoaded', () => {
    const lockedView = document.getElementById('locked-view');
    const unlockedView = document.getElementById('unlocked-view');
    const masterPasswordInput = document.getElementById('master-password');
    const unlockButton = document.getElementById('unlock-button');
    const lockButton = document.getElementById('lock-button');
    const errorMessage = document.getElementById('error-message');
    const toast = document.getElementById('toast');

    const credentialsList = document.getElementById('credentials-list');
    const searchInput = document.getElementById('search-input');
    const emptyVaultMessage = document.getElementById('empty-vault-message');

    // Tabs
    const tabs = {
        credentials: { button: document.getElementById('tab-credentials'), content: document.getElementById('content-credentials') },
        addNew: { button: document.getElementById('tab-add-new'), content: document.getElementById('content-add-new') },
        generator: { button: document.getElementById('tab-generator'), content: document.getElementById('content-generator') }
    };

    // Add New Form
    const siteNameInput = document.getElementById('site-name');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const saveButton = document.getElementById('save-button');

    // Generator
    const generatedPasswordInput = document.getElementById('generated-password');
    const copyGeneratedBtn = document.getElementById('copy-generated-btn');
    const lengthSlider = document.getElementById('length-slider');
    const lengthValue = document.getElementById('length-value');
    const uppercaseCheck = document.getElementById('uppercase-check');
    const lowercaseCheck = document.getElementById('lowercase-check');
    const numbersCheck = document.getElementById('numbers-check');
    const symbolsCheck = document.getElementById('symbols-check');
    const generateButton = document.getElementById('generate-button');
    const optionsButton = document.getElementById('options-button');

    function switchView(isUnlocked) {
        lockedView.classList.toggle('hidden', isUnlocked);
        unlockedView.classList.toggle('hidden', !isUnlocked);
        if (isUnlocked) {
            masterPasswordInput.value = '';
            errorMessage.classList.add('hidden');
            fetchAllCredentials();
            switchToTab('credentials');
        }
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2000);
    }

    // --- Event Listeners ---
    unlockButton.addEventListener('click', () => {
        const password = masterPasswordInput.value;
        if (!password) {
            showError("Master password cannot be empty.");
            return;
        }
        chrome.runtime.sendMessage({ type: 'unlock', password }, (response) => {
            if (response.success) {
                switchView(true);
            } else {
                showError(response.error);
            }
        });
    });
    
    masterPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            unlockButton.click();
        }
    });

    lockButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'lock' }, () => {
            switchView(false);
        });
    });

    saveButton.addEventListener('click', () => {
        const credential = {
            site: siteNameInput.value,
            username: usernameInput.value,
            password: passwordInput.value,
        };

        if (!credential.site || !credential.username || !credential.password) {
            showToast("All fields are required.");
            return;
        }

        chrome.runtime.sendMessage({ type: 'addCredential', credential }, (response) => {
            if (response.success) {
                siteNameInput.value = '';
                usernameInput.value = '';
                passwordInput.value = '';
                showToast('Credential saved!');
                switchToTab('credentials');
                fetchAllCredentials();
            } else {
                showToast('Error saving credential.');
            }
        });
    });

    searchInput.addEventListener('input', (e) => {
        fetchAllCredentials(e.target.value);
    });

    // --- Tab Management ---
    Object.keys(tabs).forEach(tabKey => {
        tabs[tabKey].button.addEventListener('click', () => switchToTab(tabKey));
    });

    // Fetches the current tab's hostname and populates the site input field
    function populateSiteFromCurrentTab() {
        // Ensure the input element exists before proceeding
        if (!siteNameInput) {
            console.error("Site name input field not found.");
            return;
        }

        // Note: The "tabs" permission is required in manifest.json for this to work
        chrome.tabs.query({ active: true, currentWindow: true }, (queriedTabs) => {
            // Check if the query returned any tabs and the first tab has a URL
            if (queriedTabs && queriedTabs.length > 0 && queriedTabs[0].url) {
                try {
                    const url = new URL(queriedTabs[0].url);
                    // We only want to autofill for actual websites, not internal pages
                    if (url.protocol === "http:" || url.protocol === "https:") {
                        siteNameInput.value = url.hostname;
                    } else {
                        siteNameInput.value = ''; // Clear for local files, chrome:// pages, etc.
                    }
                } catch (error) {
                    console.error("Could not parse URL:", queriedTabs[0].url, error);
                    siteNameInput.value = ''; // Clear the input on parsing error
                }
            } else {
                siteNameInput.value = ''; // Clear if no active tab found
            }
        });
    }

    function switchToTab(tabKey) {
        Object.values(tabs).forEach(tab => {
            tab.button.classList.remove('active');
            tab.content.classList.add('hidden');
        });
        tabs[tabKey].button.classList.add('active');
        tabs[tabKey].content.classList.remove('hidden');

        // Autofill site name when switching to the 'Add New' tab
        if (tabKey === 'addNew') {
            populateSiteFromCurrentTab();
        }
    }

    // --- Credential Rendering ---
    function fetchAllCredentials(searchTerm = '') {
        chrome.runtime.sendMessage({ type: 'getCredentials' }, (response) => {
            if (response.success) {
                renderCredentials(response.credentials, searchTerm);
                // Re-apply the theme to ensure newly rendered items are styled correctly
                setTheme(localStorage.getItem('popupTheme') || 'dark');
            }
        });
    }

    function renderCredentials(credentials, searchTerm) {
        credentialsList.innerHTML = '';
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        
        const filtered = credentials.filter(c => 
            c.site.toLowerCase().includes(lowerCaseSearchTerm) ||
            c.username.toLowerCase().includes(lowerCaseSearchTerm)
        );

        if (credentials.length === 0) {
            emptyVaultMessage.classList.remove('hidden');
        } else {
            emptyVaultMessage.classList.add('hidden');
        }

        if (filtered.length === 0 && credentials.length > 0) {
            credentialsList.innerHTML = `<p class="text-center text-gray-400">No credentials found for "${searchTerm}".</p>`;
            return;
        }

        filtered.forEach(cred => {
            const div = document.createElement('div');
            // The theme will now be applied by the setTheme function after rendering
            div.className = 'bg-gray-700 p-3 rounded-lg flex justify-between items-center';
            div.innerHTML = `
                <div>
                    <p class="font-bold text-lg">${cred.site}</p>
                    <p class="text-sm text-gray-300">${cred.username}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button data-value="${cred.password}" title="Copy password" class="copy-btn p-2 rounded-full hover:bg-gray-600">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 00-2 2v0m12 4h-4a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v4z"></path></svg>
                    </button>
                    <button data-id="${cred.id}" title="Delete" class="delete-btn p-2 rounded-full hover:bg-gray-600 text-red-400 hover:text-red-300">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            credentialsList.appendChild(div);
        });

        document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const passwordToCopy = e.currentTarget.getAttribute('data-value');
                navigator.clipboard.writeText(passwordToCopy).then(() => {
                    showToast('Password copied!');
                });
            });
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const idToDelete = e.currentTarget.getAttribute('data-id');
                chrome.runtime.sendMessage({ type: 'deleteCredential', id: idToDelete }, (response) => {
                    if (response.success) {
                        showToast('Credential deleted!');
                        fetchAllCredentials(searchInput.value);
                    }
                });
            });
        });
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // --- Password Generator Logic ---
    function generatePassword() {
        chrome.runtime.sendMessage({
            type: 'generatePassword',
            options: {
                length: lengthSlider.value,
                uppercase: uppercaseCheck.checked,
                lowercase: lowercaseCheck.checked,
                numbers: numbersCheck.checked,
                symbols: symbolsCheck.checked
            }
        }, (response) => {
            if (response.success) {
                generatedPasswordInput.value = response.password;
            } else {
                generatedPasswordInput.value = 'Error generating password';
            }
        });
    }

    lengthSlider.addEventListener('input', (e) => {
        lengthValue.textContent = e.target.value;
        generatePassword();
    });
    uppercaseCheck.addEventListener('change', generatePassword);
    lowercaseCheck.addEventListener('change', generatePassword);
    numbersCheck.addEventListener('change', generatePassword);
    symbolsCheck.addEventListener('change', generatePassword);
    generateButton.addEventListener('click', generatePassword);

    copyGeneratedBtn.addEventListener('click', () => {
        if(generatedPasswordInput.value) {
            navigator.clipboard.writeText(generatedPasswordInput.value).then(() => {
                showToast('Password copied!');
            });
        }
    });

    if (optionsButton) {
        optionsButton.addEventListener('click', function() {
            window.open('options.html', '_blank');
        });
    }

    // --- Theme toggle logic ---
    const themeToggle = document.getElementById('theme-toggle');

    function setTheme(theme) {
        const isLight = theme === 'light';
        document.body.style.backgroundColor = isLight ? '#F3F4F6' : '';
        document.body.style.color = isLight ? '#1F2937' : '';
        themeToggle.textContent = isLight ? '🌞' : '🌙';

        if (isLight) {
            document.body.classList.remove('bg-gray-800', 'text-white');
        } else {
            document.body.classList.add('bg-gray-800', 'text-white');
        }

        // --- Inputs & Textareas ---
        document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(el => {
            el.style.backgroundColor = isLight ? '#FFFFFF' : '';
            el.style.color = isLight ? '#1F2937' : '';
            el.style.borderColor = isLight ? '#D1D5DB' : '';
        });

        // --- Buttons ---
        document.querySelectorAll('.tab-button, #generate-button, #theme-toggle').forEach(el => {
            el.style.backgroundColor = isLight ? '#FFFFFF' : '';
            el.style.color = isLight ? '#374151' : '';
            el.style.border = isLight ? '1px solid #D1D5DB' : '';
        });
        document.querySelectorAll('.tab-button.active').forEach(el => {
            el.style.backgroundColor = isLight ? '#0891B2' : '';
            el.style.color = isLight ? '#FFFFFF' : '';
            el.style.border = isLight ? '1px solid #0891B2' : '';
        });
        document.querySelectorAll('#unlock-button, #save-button').forEach(el => {
            el.style.backgroundColor = isLight ? '#06B6D4' : '';
            el.style.color = isLight ? '#FFFFFF' : '';
            el.style.border = isLight ? 'none' : '';
        });
        document.querySelectorAll('#lock-button').forEach(el => {
            el.style.backgroundColor = isLight ? '#EF4444' : '';
            el.style.color = isLight ? '#FFFFFF' : '';
            el.style.border = isLight ? 'none' : '';
        });
        
        // --- Credential Cards ---
        document.querySelectorAll('#credentials-list > div').forEach(el => {
            el.style.backgroundColor = isLight ? '#FFFFFF' : '';
            el.style.border = isLight ? '1px solid #E5E7EB' : '';
            el.style.boxShadow = isLight ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : '';

            const siteEl = el.querySelector('.font-bold');
            if (siteEl) siteEl.style.color = isLight ? '#111827' : '';

            const usernameEl = el.querySelector('.text-sm');
            if (usernameEl) usernameEl.style.color = isLight ? '#6B7280' : '';
            
            el.querySelectorAll('.copy-btn, .delete-btn').forEach(btn => {
                const isDelete = btn.classList.contains('delete-btn');
                btn.style.color = isLight ? (isDelete ? '#EF4444' : '#6B7280') : '';
            });
        });

        localStorage.setItem('popupTheme', theme);
    }


    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = localStorage.getItem('popupTheme') === 'light' ? 'dark' : 'light';
            setTheme(currentTheme);
        });
        // Initialize theme
        setTheme(localStorage.getItem('popupTheme') || 'dark');
    }

    // --- Initial State Check ---
    chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
        switchView(response.isUnlocked);
        if (response.isUnlocked) {
            generatePassword(); // Generate a password on load if unlocked
        }
    });
});

// Lock vault when popup is closed
window.addEventListener('unload', function() {
    chrome.runtime.sendMessage({ type: 'lock' });
});