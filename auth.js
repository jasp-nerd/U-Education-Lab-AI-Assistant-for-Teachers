// Authentication module for VU Education Lab AI Assistant
// Handles Google OAuth authentication and validates VU email domains
// Note: OAuth flow now handled by background script (background.js)
// The Client ID should be configured in background.js instead

// Allowed email domains for VU users
const ALLOWED_DOMAINS = ['vu.nl', 'student.vu.nl'];

/**
 * Check if an email address is from an allowed VU domain
 * @param {string} email - The email address to validate
 * @returns {boolean} - True if email is from an allowed domain
 */
function isValidVUEmail(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith('@' + domain));
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - User object or null if not authenticated
 */
async function getCurrentUser() {
  try {
    const result = await chrome.storage.local.get(['vuAuthUser']);
    return result.vuAuthUser || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Save user data to storage
 * @param {Object} user - User data to save
 */
async function saveUser(user) {
  try {
    console.log('💾 Saving user to storage:', user.email);
    await chrome.storage.local.set({ vuAuthUser: user });
    console.log('✅ User saved successfully');
    
    // Verify it was saved
    const saved = await chrome.storage.local.get(['vuAuthUser']);
    console.log('✅ Verification - user in storage:', saved.vuAuthUser ? saved.vuAuthUser.email : 'NOT FOUND');
  } catch (error) {
    console.error('❌ Error saving user:', error);
    throw error;
  }
}

/**
 * Clear user data from storage
 */
async function clearUser() {
  try {
    await chrome.storage.local.remove(['vuAuthUser']);
  } catch (error) {
    console.error('Error clearing user:', error);
    throw error;
  }
}

/**
 * Initiate Google OAuth authentication flow
 * Delegates to background script to handle OAuth (so popup closing doesn't interrupt)
 * @returns {Promise<Object>} - User object if authentication successful
 */
async function signIn() {
  try {
    console.log('Popup: Requesting sign-in from background script...');
    
    // Send message to background script to handle OAuth
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'signIn' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response from background script'));
        } else if (!response.success) {
          reject(new Error(response.error || 'Sign in failed'));
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ Sign-in completed successfully:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * Delegates to background script to handle token revocation
 */
async function signOut() {
  try {
    console.log('Popup: Requesting sign-out from background script...');
    
    // Send message to background script to handle sign-out
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'signOut' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response) {
          reject(new Error('No response from background script'));
        } else if (!response.success) {
          reject(new Error(response.error || 'Sign out failed'));
        } else {
          resolve(response);
        }
      });
    });
    
    console.log('✅ Sign-out completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

/**
 * Revoke an OAuth token
 * @param {string} token - The token to revoke
 */
async function revokeToken(token) {
  try {
    await new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          // Also revoke on Google's servers
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    // Don't throw - continue with sign out even if revocation fails
  }
}

/**
 * Check if user is authenticated with valid VU email
 * @returns {Promise<boolean>} - True if authenticated with valid VU email
 */
async function isAuthenticated() {
  try {
    console.log('🔍 Checking authentication status...');
    const user = await getCurrentUser();
    
    if (!user || !user.email) {
      console.log('❌ No user found in storage');
      return false;
    }

    console.log('✅ User found in storage:', user.email);

    // Validate email domain
    if (!isValidVUEmail(user.email)) {
      // Invalid domain - clear user data
      console.log('❌ Invalid email domain, clearing user');
      await clearUser();
      return false;
    }

    // Check if token is still valid (optional - you might want to verify with Google)
    if (user.token) {
      console.log('✅ User is authenticated with token');
      return true;
    }

    console.log('❌ No token found');
    return false;
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return false;
  }
}

/**
 * Get user profile information
 * @returns {Promise<Object|null>} - User profile or null
 */
async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }

    return {
      email: user.email,
      name: user.name,
      picture: user.picture,
      authenticatedAt: user.authenticatedAt
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Get the current OAuth token
 * @returns {Promise<string|null>} - OAuth token or null
 */
async function getUserToken() {
  try {
    const user = await getCurrentUser();
    return user?.token || null;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

/**
 * Refresh the OAuth token silently (without user interaction)
 * @returns {Promise<string|null>} - New token or null if refresh failed
 */
async function refreshToken() {
  try {
    console.log('Attempting to refresh OAuth token...');
    
    // Get new token silently (without user interaction)
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      console.log('No token received during refresh');
      return null;
    }

    // Verify the token is valid by fetching user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Token refresh failed: invalid token from Google');
      return null;
    }

    const userInfo = await response.json();

    // Validate email domain
    if (!isValidVUEmail(userInfo.email)) {
      console.error('Token refresh failed: invalid email domain');
      await revokeToken(token);
      return null;
    }

    // Update user object with new token
    const user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      id: userInfo.id,
      token: token,
      authenticatedAt: new Date().toISOString()
    };

    await saveUser(user);
    console.log('Token refreshed successfully for:', userInfo.email);

    return token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Get a valid OAuth token, refreshing if necessary
 * @returns {Promise<string|null>} - Valid token or null
 */
async function getValidToken() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.token) {
      console.log('No user or token found');
      return null;
    }

    // Try to use the existing token first
    // Verify it's still valid by making a lightweight request
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${user.token}`
      }
    });

    if (response.ok) {
      // Token is still valid
      return user.token;
    }

    // Token is invalid (expired or revoked), try to refresh
    console.log('Token appears invalid, attempting refresh...');
    const newToken = await refreshToken();
    
    if (!newToken) {
      // Refresh failed, clear user data
      console.log('Token refresh failed, clearing user data');
      await clearUser();
      return null;
    }

    return newToken;
  } catch (error) {
    console.error('Error getting valid token:', error);
    return null;
  }
}

// Export authentication API
window.VUAuth = {
  signIn,
  signOut,
  isAuthenticated,
  getCurrentUser,
  getUserProfile,
  isValidVUEmail,
  getUserToken,
  refreshToken,
  getValidToken
};

