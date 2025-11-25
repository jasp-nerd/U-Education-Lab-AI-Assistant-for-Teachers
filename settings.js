// Settings page script for VU Education Lab AI Assistant
// Handles Gemini API key change logic

document.addEventListener('DOMContentLoaded', async () => {
  const backBtn = document.getElementById('settings-back-btn');
  const languageToggleBtn = document.getElementById('settings-language-toggle');
  const languageStatus = document.getElementById('settings-language-status');
  const floatingPopupToggle = document.getElementById('settings-floating-popup-toggle');
  const floatingPopupStatus = document.getElementById('settings-floating-popup-status');
  const signOutBtn = document.getElementById('settings-sign-out-btn');
  const accountSection = document.getElementById('settings-account-section');

  // --- TRANSLATION SUPPORT FOR SETTINGS PAGE ---
  let settingsTranslations = {};
  let settingsCurrentLang = 'en';
  function getSettingsTranslation(key) {
    return (settingsTranslations[settingsCurrentLang] && settingsTranslations[settingsCurrentLang][key]) || key;
  }
  async function loadSettingsTranslations(lang) {
    let localeFile = lang === 'nl' ? 'locales/nl.json' : 'locales/en.json';
    try {
      const res = await fetch(localeFile);
      settingsTranslations[lang] = await res.json();
    } catch (e) {
      settingsTranslations[lang] = {};
    }
  }
  function updateSettingsUILanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && getSettingsTranslation(key)) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = getSettingsTranslation(key);
        } else if (el.tagName === 'BUTTON') {
          el.textContent = getSettingsTranslation(key);
        } else {
          // For elements containing HTML (e.g., links)
          el.innerHTML = getSettingsTranslation(key);
        }
      }
    });
  }
  // --- END TRANSLATION SUPPORT ---

  // Load language settings and check backend connection
  chrome.storage.local.get(['language'], async (result) => {
    // Set language toggle button text
    const lang = result.language === 'nl' ? 'nl' : 'en';
    languageToggleBtn.textContent = lang.toUpperCase();
    languageToggleBtn.setAttribute('aria-label', lang === 'nl' ? 'Switch to English' : 'Switch to Dutch');
    // Load and apply translations
    settingsCurrentLang = lang;
    await loadSettingsTranslations('en');
    await loadSettingsTranslations('nl');
    updateSettingsUILanguage();
  });

  // Load floating popup setting
  chrome.storage.local.get(['show_floating_popup'], (result) => {
    const showFloating = result.show_floating_popup !== false; // default true
    updateFloatingPopupToggle(showFloating);
  });

  // Ensure AI provider is set to azure (no longer user-selectable)
  chrome.storage.local.set({ ai_provider: 'azure' });

  function updateFloatingPopupToggle(showFloating) {
    floatingPopupToggle.textContent = showFloating ? 'ON' : 'OFF';
    floatingPopupToggle.setAttribute('aria-pressed', showFloating);
    // Apply visual styling based on state
    if (showFloating) {
      floatingPopupToggle.style.backgroundColor = 'var(--vu-green)';
    } else {
      floatingPopupToggle.style.backgroundColor = 'var(--vu-orange)';
    }
  }

  // Language toggle logic
  languageToggleBtn.addEventListener('click', () => {
    chrome.storage.local.get(['language'], (result) => {
      let newLang = (result.language === 'nl') ? 'en' : 'nl';
      chrome.storage.local.set({ language: newLang }, async () => {
        languageToggleBtn.textContent = newLang.toUpperCase();
        languageToggleBtn.setAttribute('aria-label', newLang === 'nl' ? 'Switch to English' : 'Switch to Dutch');
        languageStatus.textContent = newLang === 'nl' ? getSettingsTranslation('settingsLanguageStatusNL') : getSettingsTranslation('settingsLanguageStatusEN');
        languageStatus.className = 'success';
        settingsCurrentLang = newLang;
        await loadSettingsTranslations('en');
        await loadSettingsTranslations('nl');
        updateSettingsUILanguage();
        setTimeout(() => { languageStatus.textContent = ''; }, 1200);
        // Reload the page to apply language immediately
        window.location.reload();
      });
    });
  });

  // Add shake animation (copied from popup.js)
  function shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  }

  // Back to popup
  backBtn.addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  floatingPopupToggle.addEventListener('click', () => {
    const isCurrentlyOn = floatingPopupToggle.textContent === 'ON';
    const showFloating = !isCurrentlyOn;
    chrome.storage.local.set({ show_floating_popup: showFloating }, () => {
      updateFloatingPopupToggle(showFloating);
      floatingPopupStatus.textContent = showFloating ? getSettingsTranslation('settingsFloatingPopupEnabled') : getSettingsTranslation('settingsFloatingPopupDisabled');
      floatingPopupStatus.className = showFloating ? 'success' : 'error';
      setTimeout(() => { floatingPopupStatus.textContent = ''; }, 1200);
    });
  });

  // Load user profile information
  async function loadUserProfile() {
    try {
      const isAuth = await window.VUAuth.isAuthenticated();
      
      if (isAuth) {
        const userProfile = await window.VUAuth.getUserProfile();
        
        if (userProfile) {
          // Update user profile UI
          document.getElementById('settings-user-name').textContent = userProfile.name || 'VU User';
          document.getElementById('settings-user-email').textContent = userProfile.email;
          
          if (userProfile.picture) {
            document.getElementById('settings-user-avatar').src = userProfile.picture;
          }
          
          // Show account section
          accountSection.style.display = 'block';
        } else {
          // Hide account section if no profile
          accountSection.style.display = 'none';
        }
      } else {
        // Hide account section if not authenticated
        accountSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      accountSection.style.display = 'none';
    }
  }

  // Sign out button handler
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        signOutBtn.disabled = true;
        const originalContent = signOutBtn.innerHTML;
        signOutBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Signing out...</span>';

        await window.VUAuth.signOut();
        
        // Redirect to popup after sign out
        window.location.href = 'popup.html';
      } catch (error) {
        console.error('Sign out error:', error);
        signOutBtn.disabled = false;
        signOutBtn.innerHTML = '<span class="btn-icon">🚪</span><span>Sign Out</span>';
        alert('Failed to sign out. Please try again.');
      }
    });
  }

  // Load user profile on page load
  await loadUserProfile();
});
