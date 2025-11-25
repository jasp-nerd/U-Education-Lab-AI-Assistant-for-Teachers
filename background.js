// Background script for VU Education Lab AI Assistant
// Handles communication between content script and popup

// OAuth Client ID for Web Application
// IMPORTANT: Replace with your actual OAuth Client ID from Google Cloud Console
const OAUTH_CLIENT_ID = 'YOUR_OAUTH_CLIENT_ID_HERE';

// Allowed email domains for VU users
const ALLOWED_DOMAINS = ['vu.nl', 'student.vu.nl'];

// Token refresh interval (every 30 minutes)
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Check if an email address is from an allowed VU domain
 */
function isValidVUEmail(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => emailLower.endsWith('@' + domain));
}

/**
 * Handle OAuth sign-in flow in background script
 * This runs in the service worker, so it won't be interrupted when popup closes
 */
async function handleSignIn() {
  try {
    console.log('Background: Starting OAuth sign-in...');
    
    // Build the OAuth URL
    const redirectUrl = chrome.identity.getRedirectURL();
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('prompt', 'select_account');
    authUrl.searchParams.set('hd', 'vu.nl');
    
    // Launch OAuth flow
    const responseUrl = await new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl.toString(),
          interactive: true
        },
        (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!responseUrl) {
            reject(new Error('No response URL received from OAuth flow'));
          } else {
            resolve(responseUrl);
          }
        }
      );
    });
    
    console.log('Background: OAuth response received');
    
    // Extract token from URL
    const urlHash = responseUrl.split('#')[1];
    if (!urlHash) {
      throw new Error('No URL fragment received in OAuth response');
    }
    
    const params = new URLSearchParams(urlHash);
    const token = params.get('access_token');
    
    if (!token) {
      throw new Error('No access token found in OAuth response');
    }
    
    console.log('Background: Token extracted, fetching user info...');
    
    // Fetch user info
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }
    
    const userInfo = await response.json();
    console.log('Background: User info received:', userInfo.email);
    
    // Validate email domain
    if (!isValidVUEmail(userInfo.email)) {
      throw new Error(`Access denied. Only VU email addresses (@vu.nl or @student.vu.nl) are allowed. Your email: ${userInfo.email}`);
    }
    
    // Create and save user object
    const user = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      id: userInfo.id,
      token: token,
      authenticatedAt: new Date().toISOString()
    };
    
    await chrome.storage.local.set({ vuAuthUser: user });
    console.log('Background: ✅ User signed in successfully:', user.email);
    
    // Start token refresh timer
    startTokenRefreshTimer();
    
    return { success: true, user };
  } catch (error) {
    console.error('Background: ❌ Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle sign-out
 */
async function handleSignOut() {
  try {
    const result = await chrome.storage.local.get(['vuAuthUser']);
    const user = result.vuAuthUser;
    
    if (user && user.token) {
      // Revoke token
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: user.token }, () => {
          fetch(`https://accounts.google.com/o/oauth2/revoke?token=${user.token}`)
            .then(() => resolve())
            .catch(() => resolve()); // Resolve even if revocation fails
        });
      });
    }
    
    // Clear user from storage
    await chrome.storage.local.remove(['vuAuthUser']);
    console.log('Background: User signed out');
    
    return { success: true };
  } catch (error) {
    console.error('Background: Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to refresh token silently
async function attemptTokenRefresh() {
  try {
    console.log('Background: Attempting periodic token refresh...');
    
    // Get current user
    const result = await chrome.storage.local.get(['vuAuthUser']);
    if (!result.vuAuthUser || !result.vuAuthUser.token) {
      console.log('Background: No user authenticated, skipping refresh');
      return;
    }
    
    // Get new token silently (without user interaction)
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (chrome.runtime.lastError) {
        console.log('Background: Token refresh failed:', chrome.runtime.lastError.message);
        return;
      }
      
      if (!token) {
        console.log('Background: No token received during refresh');
        return;
      }
      
      // Verify the token is valid
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.log('Background: Refreshed token is invalid');
          return;
        }
        
        const userInfo = await response.json();
        
        // Update user object with new token
        const updatedUser = {
          ...result.vuAuthUser,
          token: token,
          authenticatedAt: new Date().toISOString()
        };
        
        await chrome.storage.local.set({ vuAuthUser: updatedUser });
        console.log('Background: Token refreshed successfully for:', userInfo.email);
      } catch (error) {
        console.error('Background: Error validating refreshed token:', error);
      }
    });
  } catch (error) {
    console.error('Background: Error in token refresh:', error);
  }
}

// Start periodic token refresh
function startTokenRefreshTimer() {
  // Refresh immediately on startup
  attemptTokenRefresh();
  
  // Then refresh every 30 minutes
  setInterval(attemptTokenRefresh, TOKEN_REFRESH_INTERVAL);
  
  console.log('Background: Token refresh timer started (every 30 minutes)');
}

// Check authentication status on extension install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // Check if user is authenticated
  const result = await chrome.storage.local.get(['vuAuthUser']);
  if (!result.vuAuthUser) {
    console.log('User not authenticated - will require login');
  } else {
    console.log('User authenticated:', result.vuAuthUser.email);
    // Start token refresh timer
    startTokenRefreshTimer();
  }
});

// Check authentication status on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Browser started - checking authentication');
  
  const result = await chrome.storage.local.get(['vuAuthUser']);
  if (!result.vuAuthUser) {
    console.log('User not authenticated - will require login');
  } else {
    console.log('User authenticated:', result.vuAuthUser.email);
    // Start token refresh timer
    startTokenRefreshTimer();
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "signIn":
      // Handle sign-in in background script
      console.log('Background: Received sign-in request from popup');
      handleSignIn().then(result => {
        console.log('Background: Sign-in completed, sending response:', result.success);
        sendResponse(result);
      });
      return true; // Required for async sendResponse
      
    case "signOut":
      // Handle sign-out in background script
      handleSignOut().then(result => {
        sendResponse(result);
      });
      return true; // Required for async sendResponse
      
    case "analyzeContent":
      chrome.runtime.sendMessage({
        action: "processAPIRequest",
        content: request.content,
        prompt: request.prompt
      });
      break;
      
    case "getPageContent":
      chrome.scripting.executeScript({
        target: { tabId: request.tabId },
        function: getPageContent
      }).then(results => {
        sendResponse({ content: results[0].result });
      });
      return true; // Required for async sendResponse
      
    case "checkAuth":
      // Check authentication status
      chrome.storage.local.get(['vuAuthUser'], (result) => {
        sendResponse({ 
          authenticated: !!result.vuAuthUser,
          user: result.vuAuthUser || null
        });
      });
      return true; // Required for async sendResponse
      
    default:
      break;
  }
});

// Function to extract page content
function getPageContent() {
  return {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.innerText)
      .join('\n'),
    bodyText: document.body.innerText
  };
}
