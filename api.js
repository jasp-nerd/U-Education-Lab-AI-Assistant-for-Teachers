// API integration module for VU Education Lab AI Assistant
// Backend implementation - calls secure backend server for Azure OpenAI streaming

// Configuration - Backend URL
// For local development: http://localhost:3000
// For production: Azure App Service URL
const BACKEND_URL = 'https://vu-education-lab-backend.azurewebsites.net';

/**
 * Generate content using the backend server with streaming support
 * @param {string} prompt - The user prompt
 * @param {Object} options - Additional options
 * @param {Function} options.onChunk - Callback function called for each content chunk
 * @returns {Promise<string>} - The complete generated content
 */
async function generateContent(prompt, options = {}) {
  try {
    console.log(`Starting streaming request with prompt: ${prompt.substring(0, 100)}...`);

    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid input: prompt is required and must be a string');
    }

    // Get a valid token (will refresh if needed)
    const token = await window.VUAuth.getValidToken();
    if (!token) {
      throw new Error('User not authenticated. Please sign in.');
    }

    // Get user info
    const user = await window.VUAuth.getCurrentUser();
    if (!user || !user.email) {
      throw new Error('User not authenticated. Please sign in.');
    }

    // Prepare request body for backend
    const requestBody = {
      prompt: prompt,
      systemPrompt: options.systemPrompt || null,
      feature: options.feature || 'general'
    };

    console.log("Making streaming request to backend:", `${BACKEND_URL}/api/generate`);

    // Make streaming request to backend server
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-User-Email": user.email,
          "X-Extension-ID": chrome.runtime.id
        },
        body: JSON.stringify(requestBody)
    });

    // Check if response is successful
    if (!response.ok) {
      // Try to get error message
      const responseText = await response.text();
      let errorMessage = response.statusText;
      
      try {
        const data = JSON.parse(responseText);
        errorMessage = data.error || errorMessage;
      } catch (e) {
        errorMessage = responseText.substring(0, 100);
      }

      console.error("Backend Error:", {
        status: response.status,
        errorMessage
      });

      // Handle 401 - token might be expired, try to refresh and retry once
      if (response.status === 401 && !options._retryAttempted) {
        console.log("Received 401 error, attempting to refresh token and retry...");
        
        const newToken = await window.VUAuth.refreshToken();
        
        if (newToken) {
          console.log("Token refreshed, retrying request...");
          options._retryAttempted = true;
          return await generateContent(prompt, options);
        } else {
          throw new Error("Authentication expired. Please sign in again.");
        }
      }

      // Provide user-friendly error messages based on status
      let userMessage;
      switch (response.status) {
        case 401:
          userMessage = "Authentication failed. Please sign in again.";
          break;
        case 403:
          userMessage = "Access denied. Only VU emails are allowed.";
          break;
        case 400:
          userMessage = `Invalid request: ${errorMessage}`;
          break;
        case 429:
          userMessage = "Too many requests. Please wait a moment and try again.";
          break;
        case 500:
          userMessage = `Server error: ${errorMessage}`;
          break;
        case 503:
          userMessage = "Backend server is temporarily unavailable. Please try again later.";
          break;
        default:
          userMessage = `Backend error (${response.status}): ${errorMessage}`;
      }

      throw new Error(userMessage);
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let streamDone = false;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream complete - connection closed');
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine === '' || !trimmedLine.startsWith('data: ')) {
          continue;
        }

        const jsonStr = trimmedLine.substring(6); // Remove 'data: ' prefix
        
        try {
          const data = JSON.parse(jsonStr);
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (data.content) {
            fullContent += data.content;
            // Call the onChunk callback if provided
            if (options.onChunk && typeof options.onChunk === 'function') {
              options.onChunk(data.content);
            }
          }
          
          if (data.warning) {
            console.warn('Backend warning:', data.warning);
          }
          
          if (data.done) {
            console.log('Stream marked as done by server');
            streamDone = true;
            break;
          }
        } catch (parseError) {
          console.error('Error parsing streaming chunk:', parseError, 'Line:', jsonStr);
        }
      }
      
      // Break outer loop if stream is done
      if (streamDone) {
        break;
      }
    }

    console.log("Content generation successful, total length:", fullContent.length);
    return fullContent;

  } catch (error) {
    console.error('Error calling backend API:', error);
    
    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Unable to connect to backend server. Please check if the server is running at ${BACKEND_URL}`);
    }
    
    // Re-throw the error with appropriate message
    throw new Error(error.message || "Unknown error occurred while contacting the backend server");
  }
}

/**
 * Validate the backend connection and API key configuration
 * @returns {Promise<boolean>} - Whether the backend is accessible and properly configured
 */
async function validateConnection() {
  try {
    console.log("Validating backend connection...");

    // Get a valid token (will refresh if needed)
    const token = await window.VUAuth.getValidToken();
    const user = await window.VUAuth.getCurrentUser();
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth if user is signed in
    if (token && user?.email) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-User-Email'] = user.email;
      headers['X-Extension-ID'] = chrome.runtime.id;
    }

    // First check if backend is reachable
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: headers
    });

    if (!healthResponse.ok) {
      console.error("Backend health check failed:", healthResponse.status);
      return false;
    }

    const healthData = await healthResponse.json();
    console.log("Backend health check passed:", healthData);

    // Then check Azure OpenAI configuration on backend
    const validateResponse = await fetch(`${BACKEND_URL}/api/validate`, {
        method: 'GET',
        headers: headers
    });

    if (!validateResponse.ok) {
      console.error("Backend validation check failed:", validateResponse.status);
      return false;
    }

    const validateData = await validateResponse.json();
    console.log("Backend validation result:", validateData);

    // Return the validation data (contains azure status)
    return validateData;

  } catch (error) {
    console.error('Error validating backend connection:', error);
    return false;
  }
}

/**
 * Get backend configuration and status
 * @returns {Promise<Object>} - Backend status information
 */
async function getBackendStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting backend status:', error);
    throw new Error('Backend server is not accessible');
  }
}

// Export functions for use in popup.js
window.GeminiAPI = {
  generateContent,
  validateConnection,
  getBackendStatus,
  // Legacy compatibility - remove API key functions since they're no longer needed
  validateApiKey: async () => {
    console.warn('validateApiKey is deprecated - API keys are now handled by the backend');
    return await validateConnection();
  }
};
