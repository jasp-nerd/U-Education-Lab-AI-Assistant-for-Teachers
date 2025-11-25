// Utility: safely get element by id
function $(id) {
  return document.getElementById(id);
}

// i18n: Load translation files dynamically
let translations = {};
let currentLanguage = 'english';

// Loads the translation JSON for the selected language
async function loadTranslations(lang) {
  if (!['english', 'dutch'].includes(lang)) lang = 'english';
  let localeFile = lang === 'english' ? 'locales/en.json' : 'locales/nl.json';
  try {
    const res = await fetch(localeFile);
    translations[lang] = await res.json();
  } catch (e) {
    console.error('Failed to load translations:', localeFile, e);
    translations[lang] = {};
  }
}

// Centralized translation getter
function getTranslation(key) {
  return (translations[currentLanguage] && translations[currentLanguage][key]) || key;
}

// Helper: Get language name in English for prompt suffix
function getLanguageDisplayName(lang) {
  switch (lang) {
    case 'dutch': return 'Dutch';
    // Add more languages as needed
    default: return lang.charAt(0).toUpperCase() + lang.slice(1);
  }
}

// Helper: Get prompt from EN locale, regardless of current language
function getEnglishPrompt(key) {
  if (translations['english'] && translations['english'][key]) {
    return translations['english'][key];
  }
  return key;
}

// Modify prompt before sending to Gemini
function getPromptWithLanguageSuffix(promptKey) {
  let prompt = getTranslation(promptKey);
  if (currentLanguage !== 'english') {
    // Always use the English prompt template, not the translation key value
    prompt = getEnglishPrompt(promptKey);
    return prompt + ` IMPORTANT: Please use ${getLanguageDisplayName(currentLanguage)} in your response.`;
  }
  return prompt;
}

// Update all UI elements with translation keys
function updateUILanguage() {
  // Title
  if ($("title")) $("title").innerText = getTranslation('title');
  // Language toggle button
  if (languageToggleBtn) languageToggleBtn.innerText = currentLanguage === 'english' ? 'NL' : 'EN';

  // Tabs
  const tabKeys = ['summarize', 'quiz', 'explain', 'suggest', 'custom'];
  tabButtons.forEach((button, idx) => {
    const tabKey = tabKeys[idx];
    if (tabKey && getTranslation(tabKey)) {
      button.textContent = getTranslation(tabKey);
    }
  });

  // Summarize tab
  const summarizeH2 = document.querySelector('#summarize h2');
  if (summarizeH2) summarizeH2.textContent = getTranslation('summarizeTitle');
  const summarizeDescP = document.querySelector('#summarize p');
  if (summarizeDescP) summarizeDescP.textContent = getTranslation('summarizeDesc');
  const summaryLengthShort = document.querySelector('#summary-length option[value="short"]');
  if (summaryLengthShort) summaryLengthShort.textContent = getTranslation('short');
  const summaryLengthMedium = document.querySelector('#summary-length option[value="medium"]');
  if (summaryLengthMedium) summaryLengthMedium.textContent = getTranslation('medium');
  const summaryLengthLong = document.querySelector('#summary-length option[value="long"]');
  if (summaryLengthLong) summaryLengthLong.textContent = getTranslation('long');
  if (generateSummaryBtn) generateSummaryBtn.textContent = getTranslation('generate');

  // Quiz tab
  const quizH2 = document.querySelector('#quiz h2');
  if (quizH2) quizH2.textContent = getTranslation('quizTitle');
  const quizDescP = document.querySelector('#quiz p');
  if (quizDescP) quizDescP.textContent = getTranslation('quizDesc');
  const questionTypeMultiple = document.querySelector('#question-type option[value="multiple-choice"]');
  if (questionTypeMultiple) questionTypeMultiple.textContent = getTranslation('multipleChoice');
  const questionTypeTrueFalse = document.querySelector('#question-type option[value="true-false"]');
  if (questionTypeTrueFalse) questionTypeTrueFalse.textContent = getTranslation('trueFalse');
  const questionTypeShortAnswer = document.querySelector('#question-type option[value="short-answer"]');
  if (questionTypeShortAnswer) questionTypeShortAnswer.textContent = getTranslation('shortAnswer');
  const questionTypeMixed = document.querySelector('#question-type option[value="mixed"]');
  if (questionTypeMixed) questionTypeMixed.textContent = getTranslation('mixed');
  const questionCount = document.querySelector('#question-count');
  if (questionCount) questionCount.placeholder = getTranslation('questionCount');
  const quizDifficulty = document.querySelector('#quiz-difficulty');
  if (quizDifficulty) quizDifficulty.placeholder = getTranslation('difficulty');
  const quizDifficultyEasy = document.querySelector('#quiz-difficulty option[value="easy"]');
  if (quizDifficultyEasy) quizDifficultyEasy.textContent = getTranslation('easy');
  const quizDifficultyMedium = document.querySelector('#quiz-difficulty option[value="medium"]');
  if (quizDifficultyMedium) quizDifficultyMedium.textContent = getTranslation('medium');
  const quizDifficultyHard = document.querySelector('#quiz-difficulty option[value="hard"]');
  if (quizDifficultyHard) quizDifficultyHard.textContent = getTranslation('hard');
  if (generateQuizBtn) generateQuizBtn.textContent = getTranslation('generate');

  // Explain tab
  const explainH2 = document.querySelector('#explain h2');
  if (explainH2) explainH2.textContent = getTranslation('explainTitle');
  const explainDescP = document.querySelector('#explain p');
  if (explainDescP) explainDescP.textContent = getTranslation('explainDesc');
  const topicInput = document.querySelector('#topic-input');
  if (topicInput) topicInput.placeholder = getTranslation('topicPlaceholder');
  const explanationLevelBeginner = document.querySelector('#explanation-level option[value="beginner"]');
  if (explanationLevelBeginner) explanationLevelBeginner.textContent = getTranslation('beginner');
  const explanationLevelIntermediate = document.querySelector('#explanation-level option[value="intermediate"]');
  if (explanationLevelIntermediate) explanationLevelIntermediate.textContent = getTranslation('intermediate');
  const explanationLevelAdvanced = document.querySelector('#explanation-level option[value="advanced"]');
  if (explanationLevelAdvanced) explanationLevelAdvanced.textContent = getTranslation('advanced');
  if (generateExplanationBtn) generateExplanationBtn.textContent = getTranslation('explain');

  // Suggest tab
  const suggestH2 = document.querySelector('#suggest h2');
  if (suggestH2) suggestH2.textContent = getTranslation('suggestTitle');
  const suggestDescP = document.querySelector('#suggest p');
  if (suggestDescP) suggestDescP.textContent = getTranslation('suggestDesc');
  const teachingFormatLecture = document.querySelector('#teaching-format option[value="lecture"]');
  if (teachingFormatLecture) teachingFormatLecture.textContent = getTranslation('lecture');
  const teachingFormatDiscussion = document.querySelector('#teaching-format option[value="discussion"]');
  if (teachingFormatDiscussion) teachingFormatDiscussion.textContent = getTranslation('discussion');
  const teachingFormatActivity = document.querySelector('#teaching-format option[value="activity"]');
  if (teachingFormatActivity) teachingFormatActivity.textContent = getTranslation('activity');
  const teachingFormatAssessment = document.querySelector('#teaching-format option[value="assessment"]');
  if (teachingFormatAssessment) teachingFormatAssessment.textContent = getTranslation('assessment');
  if (generateSuggestionsBtn) generateSuggestionsBtn.textContent = getTranslation('getSuggestions');

  // Loading
  const loadingP = document.querySelector('#loading p');
  if (loadingP) loadingP.textContent = getTranslation('processing');

  // Result actions
  if (copyResultBtn) copyResultBtn.textContent = getTranslation('copy');

  // Footer
  const footerP = document.querySelector('footer p');
  if (footerP) footerP.textContent = getTranslation('footer');

  // Custom tab
  const customH2 = document.querySelector('#custom h2');
  if (customH2) customH2.textContent = getTranslation('customTitle');
  const customDescP = document.querySelector('#custom p');
  if (customDescP) customDescP.textContent = getTranslation('customDesc');
  const customPromptInput = document.querySelector('#custom-prompt');
  if (customPromptInput) customPromptInput.placeholder = getTranslation('customPlaceholder');
  if (generateCustomBtn) generateCustomBtn.textContent = getTranslation('ask');
  const templateLabel = document.querySelector('.template-label');
  if (templateLabel) templateLabel.textContent = getTranslation('templateLabel');

  // Update template button texts
  const templateMainArgsBtn = document.querySelector('.template-btn[data-prompt="What are the main arguments presented in this text?"]');
  if (templateMainArgsBtn) templateMainArgsBtn.textContent = getTranslation('templateMainArgs');
  const templateConceptMapBtn = document.querySelector('.template-btn[data-prompt="Create a concept map based on this content."]');
  if (templateConceptMapBtn) templateConceptMapBtn.textContent = getTranslation('templateConceptMap');
  const templateImplicationsBtn = document.querySelector('.template-btn[data-prompt="What are the implications of this content for students?"]');
  if (templateImplicationsBtn) templateImplicationsBtn.textContent = getTranslation('templateImplications');
  const templateBiasAnalysisBtn = document.querySelector('.template-btn[data-prompt="Identify any biases or limitations in this content."]');
  if (templateBiasAnalysisBtn) templateBiasAnalysisBtn.textContent = getTranslation('templateBiasAnalysis');
  const templateLearningStylesBtn = document.querySelector('.template-btn[data-prompt="How could I adapt this content for different learning styles?"]');
  if (templateLearningStylesBtn) templateLearningStylesBtn.textContent = getTranslation('templateLearningStyles');
  const templateReflectionQuestionsBtn = document.querySelector('.template-btn[data-prompt="Create 3 reflection questions for students after studying this content."]');
  if (templateReflectionQuestionsBtn) templateReflectionQuestionsBtn.textContent = getTranslation('templateReflectionQuestions');

  // Update tooltips
  updateTooltips();
}

// Language switch handler
async function switchLanguage(lang) {
  if (!translations[lang]) await loadTranslations(lang);
  currentLanguage = lang;
  updateUILanguage();
  // Persist language choice in both chrome.storage.local and localStorage for compatibility
  const chromeLang = lang === 'dutch' ? 'nl' : 'en';
  chrome.storage.local.set({ language: chromeLang });
  localStorage.setItem('vu_educationlab_extension_language', lang);
}

// Authentication check and UI management
async function checkAuthenticationAndShowUI() {
  console.log('🔄 checkAuthenticationAndShowUI called');
  const authSection = document.getElementById('auth-section');
  const featuresSection = document.getElementById('features-section');
  const noApiKeyOverlay = document.getElementById('no-api-key-overlay');

  try {
    const isAuth = await window.VUAuth.isAuthenticated();
    console.log('🔐 Authentication status:', isAuth);
    
    if (isAuth) {
      // User is authenticated - hide auth section and show features
      console.log('✅ User authenticated - showing features');
      authSection.style.display = 'none';
      
      // Check backend connection
      const isConnected = await window.GeminiAPI.validateConnection();
      console.log('🔌 Backend connection:', isConnected);
      
      if (isConnected) {
        console.log('✅ Backend connected - showing features section');
        if (noApiKeyOverlay) {
          noApiKeyOverlay.style.display = 'none';
          noApiKeyOverlay.style.pointerEvents = 'none';
        }
        if (featuresSection) {
          featuresSection.classList.remove('hidden');
          featuresSection.style.display = 'block'; // Explicitly set display
        }
      } else {
        console.log('❌ Backend not connected - showing overlay');
        if (noApiKeyOverlay) {
          const overlayTitle = noApiKeyOverlay.querySelector('h2');
          const overlayText = noApiKeyOverlay.querySelector('p');
          
          if (overlayTitle) overlayTitle.textContent = 'Backend Connection Required';
          if (overlayText) overlayText.innerHTML = 'Unable to connect to the backend server. Please ensure the server is running and properly configured.';
          
          noApiKeyOverlay.style.display = 'flex';
          noApiKeyOverlay.style.pointerEvents = 'auto';
        }
        if (featuresSection) featuresSection.classList.add('hidden');
      }
    } else {
      // User is not authenticated - show auth section
      console.log('❌ User not authenticated - showing auth section');
      authSection.style.display = 'block';
      featuresSection.classList.add('hidden');
      
      if (noApiKeyOverlay) {
        noApiKeyOverlay.style.display = 'none';
        noApiKeyOverlay.style.pointerEvents = 'none';
      }
    }
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    // On error, show auth section
    authSection.style.display = 'block';
    featuresSection.classList.add('hidden');
  }
}

// On DOMContentLoaded, load default or saved language
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  apiKeyInput = document.getElementById('api-key');
  saveApiKeyBtn = document.getElementById('save-api-key');
  apiStatus = document.getElementById('api-status');
  featuresSection = document.getElementById('features-section');
  apiKeySection = document.getElementById('api-key-section');
  
  tabButtons = document.querySelectorAll('.tab-btn');
  tabPanes = document.querySelectorAll('.tab-pane');
  
  resultContainer = document.getElementById('result-container');
  resultContent = document.getElementById('result-content');
  loadingIndicator = document.getElementById('loading');
  resultActions = document.querySelector('.result-actions');
  
  copyResultBtn = document.getElementById('copy-result');
  
  generateSummaryBtn = document.getElementById('generate-summary');
  generateQuizBtn = document.getElementById('generate-quiz');
  generateExplanationBtn = document.getElementById('generate-explanation');
  generateSuggestionsBtn = document.getElementById('generate-suggestions');
  
  languageToggleBtn = document.getElementById('language-toggle-btn');
  settingsBtn = document.getElementById('settings-btn');
  
  noApiKeyOverlay = document.getElementById('no-api-key-overlay');
  gotoSettingsBtn = document.getElementById('goto-settings-btn');
  
  generateCustomBtn = document.getElementById('generate-custom');
  customPromptInput = document.getElementById('custom-prompt');
  templateButtons = document.querySelectorAll('.template-btn');
  
  // Hide API key section (now only in settings)
  if (apiKeySection) apiKeySection.style.display = 'none';

  // Settings button navigation
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      window.location.href = 'settings.html';
    });
  }
  
  // Check connection from overlay
  if (gotoSettingsBtn) {
    gotoSettingsBtn.addEventListener('click', async () => {
      // Show loading state
      gotoSettingsBtn.textContent = 'Checking...';
      gotoSettingsBtn.disabled = true;
      
      try {
        const isConnected = await window.GeminiAPI.validateConnection();
        if (isConnected) {
          // Hide overlay and show features
          if (noApiKeyOverlay) {
            noApiKeyOverlay.style.display = 'none';
            noApiKeyOverlay.style.pointerEvents = 'none';
          }
          if (featuresSection) featuresSection.classList.remove('hidden');
          
          gotoSettingsBtn.textContent = '✓ Connected!';
          setTimeout(() => {
            gotoSettingsBtn.textContent = 'Check Connection';
            gotoSettingsBtn.disabled = false;
          }, 2000);
        } else {
          // Show error state
          gotoSettingsBtn.textContent = '❌ Failed';
          setTimeout(() => {
            gotoSettingsBtn.textContent = 'Check Connection';
            gotoSettingsBtn.disabled = false;
          }, 2000);
        }
      } catch (error) {
        console.error('Connection check failed:', error);
        gotoSettingsBtn.textContent = '❌ Error';
        setTimeout(() => {
          gotoSettingsBtn.textContent = 'Check Connection';
          gotoSettingsBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Language: load saved or default
  chrome.storage.local.get(['language'], async (result) => {
    let savedLang = result.language;
    if (!savedLang) {
      savedLang = localStorage.getItem('vu_educationlab_extension_language');
    }
    currentLanguage = savedLang === 'nl' ? 'dutch' : 'english';
    await loadTranslations('english');
    await loadTranslations('dutch');
    updateUILanguage();
  });

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      addButtonClickEffect(button);
      switchTab(button.dataset.tab);
    });
  });
  
  // Feature buttons with click effects
  generateSummaryBtn.addEventListener('click', () => {
    addButtonClickEffect(generateSummaryBtn);
    generateSummary();
  });
  
  generateQuizBtn.addEventListener('click', () => {
    addButtonClickEffect(generateQuizBtn);
    generateQuiz();
  });
  
  generateExplanationBtn.addEventListener('click', () => {
    addButtonClickEffect(generateExplanationBtn);
    generateExplanation();
  });
  
  generateSuggestionsBtn.addEventListener('click', () => {
    addButtonClickEffect(generateSuggestionsBtn);
    generateSuggestions();
  });
  
  // Result actions
  copyResultBtn.addEventListener('click', () => {
    addButtonClickEffect(copyResultBtn);
    copyResult();
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Add template button event listeners
  templateButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Get the appropriate prompt based on current language
      const promptKey = currentLanguage === 'english' ? 'data-prompt' : 'data-prompt-nl';
      const promptText = button.getAttribute(promptKey);
      if (promptText) {
        customPromptInput.value = promptText;
        // Focus on the textarea after setting the value
        customPromptInput.focus();
      }
      // Add visual feedback
      addButtonClickEffect(button);
    });
  });

  generateCustomBtn.addEventListener('click', () => {
    addButtonClickEffect(generateCustomBtn);
    generateCustomResponse();
  });
  
  // Custom prompt keyboard shortcut
  customPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      generateCustomResponse();
    }
  });

  // Update tooltips based on current language
  updateTooltips();

  // Setup authentication event listeners
  const signInBtn = document.getElementById('sign-in-btn');
  const authError = document.getElementById('auth-error');

  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      try {
        signInBtn.disabled = true;
        signInBtn.textContent = 'Signing in...';
        authError.style.display = 'none';

        console.log('🔐 Starting sign-in process...');
        await window.VUAuth.signIn();
        console.log('✅ Sign-in completed, refreshing UI...');
        
        // Show success feedback
        signInBtn.textContent = '✅ Signed in!';
        signInBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        
        // Small delay to ensure storage write completes
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Refresh UI after successful sign in
        await checkAuthenticationAndShowUI();
        
        console.log('✅ UI refresh complete');
        
        // If we got here, sign-in was successful
        // The auth section should now be hidden and features should be visible
      } catch (error) {
        console.error('❌ Sign in error:', error);
        authError.textContent = error.message || 'Sign in failed. Please try again.';
        authError.style.display = 'block';
        
        signInBtn.disabled = false;
        signInBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width: 18px; height: 18px; margin-right: 8px;">Sign in with Google';
      }
    });
  }

  // Check authentication status on load
  await checkAuthenticationAndShowUI();
  
  // Listen for storage changes (e.g., when auth completes)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.vuAuthUser) {
      console.log('🔄 Auth state changed, refreshing UI...');
      checkAuthenticationAndShowUI();
    }
  });
});

// Handle keyboard navigation
function handleKeyboardNavigation(e) {
  // Tab navigation with arrow keys when tabs are focused
  if (document.activeElement.classList.contains('tab-btn')) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      
      const activeTabIndex = Array.from(tabButtons).findIndex(btn => 
        btn.classList.contains('active')
      );
      
      let newIndex;
      if (e.key === 'ArrowRight') {
        newIndex = (activeTabIndex + 1) % tabButtons.length;
      } else {
        newIndex = (activeTabIndex - 1 + tabButtons.length) % tabButtons.length;
      }
      
      tabButtons[newIndex].click();
      tabButtons[newIndex].focus();
    }
  }
  
  // Use Escape to clear status messages
  if (e.key === 'Escape') {
    if (apiStatus.textContent) {
      setTimeout(() => {
        apiStatus.textContent = '';
        apiStatus.className = '';
      }, 200);
    }
  }
}

// Add visual click effect to buttons
function addButtonClickEffect(button) {
  button.classList.add('button-click');
  setTimeout(() => {
    button.classList.remove('button-click');
  }, 300);
}

// Get current tab content
async function getCurrentTabContent() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: "getPageContent" },
        (response) => {
          if (response && response.content) {
            resolve(response.content);
          } else {
            // If content script hasn't responded, try using the background script
            chrome.runtime.sendMessage(
              { 
                action: "getPageContent",
                tabId: activeTab.id
              },
              (response) => {
                resolve(response ? response.content : { 
                  title: activeTab.title,
                  url: activeTab.url,
                  text: "Could not extract page content."
                });
              }
            );
          }
        }
      );
    });
  });
}

// Helper function to create structured content from page content
function createStructuredContent(pageContent) {
  let structuredContent = `Title: ${pageContent.title}\n`;
  
  if (pageContent.metaDescription) {
    structuredContent += `Description: ${pageContent.metaDescription}\n`;
  }
  
  if (pageContent.headings && pageContent.headings.h1 && pageContent.headings.h1.length > 0) {
    structuredContent += `Main Headings: ${pageContent.headings.h1.join(', ')}\n`;
  }
  
  if (pageContent.paragraphs && pageContent.paragraphs.length > 0) {
    structuredContent += `\nContent:\n${pageContent.paragraphs.join('\n\n')}\n`;
  } else {
    structuredContent += `\nContent:\n${pageContent.text}\n`;
  }
  
  // Include lists if available
  if (pageContent.lists && pageContent.lists.length > 0) {
    structuredContent += `\nLists:\n`;
    pageContent.lists.forEach(list => {
      structuredContent += `${list.type.toUpperCase()}:\n`;
      list.items.forEach((item, index) => {
        structuredContent += `${index + 1}. ${item}\n`;
      });
      structuredContent += `\n`;
    });
  }
  
  return structuredContent;
}

// Generate summary of current page
async function generateSummary() {
  showLoading();
  
  const summaryLengthOption = document.getElementById('summary-length').value;
  const pageContent = await getCurrentTabContent();
  
  // Create a more structured prompt using the enhanced content extraction
  const structuredContent = createStructuredContent(pageContent);
  
  const prompt = getPromptWithLanguageSuffix('summaryPrompt')
    .replace('{length}', summaryLengthOption)
    .replace('{content}', structuredContent);
  
  callGemini(prompt, 'summarize');
  
  // Highlight key terms on the page
  highlightKeyTerms();
}

// Generate quiz questions from current page
async function generateQuiz() {
  showLoading();
  
  const questionType = document.getElementById('question-type').value;
  const questionCount = document.getElementById('question-count').value;
  const quizDifficulty = document.getElementById('quiz-difficulty').value;
  const pageContent = await getCurrentTabContent();
  
  // Create a more structured prompt using the enhanced content extraction
  const structuredContent = createStructuredContent(pageContent);
  
  const quizOptions = getQuizOptions();
  const prompt = getPromptWithLanguageSuffix('quizPrompt')
    .replace('{count}', questionCount)
    .replace('{type}', questionType)
    .replace('{difficulty}', quizDifficulty)
    .replace('{level}', quizOptions.level)
    .replace('{content}', structuredContent);

  callGemini(prompt, 'quiz');
}

// Helper function to get quiz options
function getQuizOptions() {
  const type = document.getElementById('question-type').value;
  const difficulty = document.getElementById('quiz-difficulty').value;
  const level = 'university';
  return { type, difficulty, level };
}

// Generate explanation of complex topics
async function generateExplanation() {
  showLoading();
  
  const topic = document.getElementById('topic-input').value;
  const level = document.getElementById('explanation-level').value;
  const pageContent = await getCurrentTabContent();
  
  // Create a more structured prompt using the enhanced content extraction
  const structuredContent = createStructuredContent(pageContent);
  
  let prompt;
  
  if (topic) {
    prompt = getPromptWithLanguageSuffix('explainTopicPrompt')
      .replace('{topic}', topic)
      .replace('{level}', level)
      .replace('{content}', structuredContent);
  } else {
    prompt = getPromptWithLanguageSuffix('explainGeneralPrompt')
      .replace('{level}', level)
      .replace('{content}', structuredContent);
  }
  
  callGemini(prompt, 'explain');
  
  // If a specific topic was provided, highlight it on the page
  if (topic) {
    highlightSpecificTerm(topic);
  }
}

// Generate teaching suggestions
async function generateSuggestions() {
  showLoading();
  
  const format = document.getElementById('teaching-format').value;
  const pageContent = await getCurrentTabContent();
  
  // Create a more structured prompt using the enhanced content extraction
  const structuredContent = createStructuredContent(pageContent);
  
  // Use the appropriate prompt based on the format
  let prompt;
  if (format === 'essay') {
    prompt = getPromptWithLanguageSuffix('essayPrompt')
      .replace('{content}', structuredContent);
  } else {
    prompt = getPromptWithLanguageSuffix('suggestPrompt')
      .replace('{format}', format)
      .replace('{content}', structuredContent);
  }
  
  callGemini(prompt, 'suggest');
}

// Send highlight request to content script
function sendHighlightRequest(action, text = null) {
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(
        activeTab.id,
        { 
          action: action,
          ...(text && { text })
        }
      );
    });
  } catch (error) {
    console.error(`Error with highlight request (${action}):`, error);
  }
}

// Highlight key terms on the page
async function highlightKeyTerms() {
  sendHighlightRequest("clearHighlights");
}

// Highlight specific term on the page
async function highlightSpecificTerm(term) {
  if (!term) return;
  sendHighlightRequest("highlightText", term);
}

// Call Backend API with streaming support
async function callGemini(prompt, feature) {
    try {
      // Prepare system prompt based on feature
      let systemPrompt;
      
      switch (feature) {
        case 'summarize':
          systemPrompt = getTranslation('summarizeSystemPrompt');
          break;
        case 'quiz':
          systemPrompt = getTranslation('quizSystemPrompt');
          break;
        case 'explain':
          systemPrompt = getTranslation('explainSystemPrompt');
          break;
        case 'suggest':
          systemPrompt = getTranslation('suggestSystemPrompt');
          break;
        case 'custom':
          systemPrompt = getTranslation('customSystemPrompt');
          break;
      }
      
      // Set up for streaming display
      hideLoading();
      resultContent.innerHTML = '';
      resultContent.style.opacity = '1';
      resultActions.classList.add('hidden');
      
      let accumulatedText = '';
      
      // Set options for API call with streaming callback
      const options = {
        systemPrompt: systemPrompt,
        feature: feature,
        onChunk: (chunk) => {
          // Accumulate the text
          accumulatedText += chunk;
          
          // Convert markdown to HTML and display
          const formattedText = convertMarkdownToHTML(accumulatedText);
          resultContent.innerHTML = formattedText;
          
          // Scroll to bottom of result container to show new content
          resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };
      
      // Call the backend API using the window.GeminiAPI exported from api.js
      const response = await window.GeminiAPI.generateContent(prompt, options);
      
      // Display final result (in case there were any issues with streaming)
      displayResult(response);
      
    } catch (error) {
      hideLoading();
      
      // Check if it's an authentication error
      if (error.message.includes('Authentication') || error.message.includes('sign in')) {
        resultContent.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <h3 style="color: #d32f2f; margin-bottom: 10px;">Authentication Required</h3>
            <p style="margin-bottom: 15px;">${error.message}</p>
            <button id="retry-auth-btn" style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            ">Sign In Again</button>
          </div>
        `;
        
        // Add event listener to the button
        const retryBtn = document.getElementById('retry-auth-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', async () => {
            try {
              retryBtn.textContent = 'Signing in...';
              retryBtn.disabled = true;
              await window.VUAuth.signIn();
              await checkAuthenticationAndShowUI();
            } catch (signInError) {
              console.error('Sign in error:', signInError);
              alert(signInError.message || 'Sign in failed. Please try again.');
              retryBtn.textContent = 'Sign In Again';
              retryBtn.disabled = false;
            }
          });
        }
      } else {
        resultContent.textContent = `Error: ${error.message}`;
      }
      
      resultContent.classList.add('error-text');
      console.error('Backend API Error:', error);
      shakeElement(resultContainer);
      
      setTimeout(() => {
        resultContent.classList.remove('error-text');
      }, 2000);
    }
}

// Display API response with markdown formatting
function displayResult(text) {
  hideLoading();
  
  // Add animation for result appearance
  resultContent.style.opacity = '0';
  
  // Convert markdown to HTML using simple regex replacements
  const formattedText = convertMarkdownToHTML(text);
  
  // Use innerHTML to render the formatted HTML
  resultContent.innerHTML = formattedText;
  
  setTimeout(() => {
    resultContent.style.opacity = '1';
    
    // Smooth scroll to results
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Show action buttons with animation
    setTimeout(() => {
      resultActions.classList.remove('hidden');
      resultActions.style.opacity = '0';
      resultActions.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        resultActions.style.opacity = '1';
        resultActions.style.transform = 'translateY(0)';
      }, 50);
    }, 300);
  }, 150);
}

// Function to convert markdown to HTML
function convertMarkdownToHTML(text) {
  if (!text) return '';
  
  // Normalize line endings and trim excess whitespace
  text = text.trim().replace(/\r\n/g, '\n');
  
  // Replace headings (must be done before other replacements)
  text = text.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  text = text.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Replace bold (before italic to handle ***)
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Replace italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Process lists more carefully
  // Unordered lists
  text = text.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
  // Ordered lists
  text = text.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in ul/ol tags
  text = text.replace(/(<li>[\s\S]+?<\/li>)(?:\n|$)/g, (match) => {
    // Check if it's part of an existing list
    if (match.includes('<ul>') || match.includes('<ol>')) {
      return match;
    }
    // Wrap in ul by default (could be improved to detect ordered vs unordered)
    return '<ul>' + match.trim() + '</ul>\n';
  });
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Split into blocks and wrap non-formatted text in paragraphs
  const lines = text.split('\n');
  const result = [];
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line is already formatted (heading, list, etc.)
    const isFormatted = line.startsWith('<h') || 
                       line.startsWith('<ul') || 
                       line.startsWith('<ol') || 
                       line.startsWith('</ul') || 
                       line.startsWith('</ol') ||
                       line.startsWith('<li');
    
    if (isFormatted) {
      // Flush current paragraph if any
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join(' ') + '</p>');
        currentParagraph = [];
      }
      result.push(line);
    } else if (line === '') {
      // Empty line - flush paragraph
      if (currentParagraph.length > 0) {
        result.push('<p>' + currentParagraph.join(' ') + '</p>');
        currentParagraph = [];
      }
    } else {
      // Regular text line - add to current paragraph
      currentParagraph.push(line);
    }
  }
  
  // Flush any remaining paragraph
  if (currentParagraph.length > 0) {
    result.push('<p>' + currentParagraph.join(' ') + '</p>');
  }
  
  return result.join('\n');
}

// Show loading indicator
function showLoading() {
  resultContent.textContent = '';
  resultContent.style.opacity = '1';
  resultActions.classList.add('hidden');
  loadingIndicator.classList.remove('hidden');
  
  // Add fade-in animation for loading
  loadingIndicator.style.opacity = '0';
  setTimeout(() => {
    loadingIndicator.style.opacity = '1';
  }, 50);
}

// Hide loading indicator
function hideLoading() {
  // Add fade-out animation
  loadingIndicator.style.opacity = '0';
  
  setTimeout(() => {
  loadingIndicator.classList.add('hidden');
  }, 300);
}

// Copy result to clipboard
function copyResult() {
  // Create a temporary element to get the formatted text with proper line breaks
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = resultContent.innerHTML;
  
  // Process the HTML to create a clean text version with proper formatting
  const text = processHTMLForCopy(tempDiv);
  
  navigator.clipboard.writeText(text)
    .then(() => {
      const originalText = copyResultBtn.textContent;
      const originalWidth = copyResultBtn.offsetWidth;
      copyResultBtn.style.minWidth = `${originalWidth}px`;
      
      // Success feedback
      copyResultBtn.textContent = '✓ Copied!';
      copyResultBtn.classList.add('success-action');
      
      setTimeout(() => {
        copyResultBtn.textContent = originalText;
        copyResultBtn.classList.remove('success-action');
        setTimeout(() => {
          copyResultBtn.style.minWidth = '';
        }, 300);
      }, 2000);
    })
    .catch(err => {
      copyResultBtn.textContent = '❌ Failed';
      copyResultBtn.classList.add('error-action');
      
      setTimeout(() => {
        copyResultBtn.textContent = originalText;
        copyResultBtn.classList.remove('error-action');
      }, 2000);
      
      console.error('Failed to copy text: ', err);
    });
}

// Process HTML for copying with proper formatting
function processHTMLForCopy(element) {
  let result = '';
  const children = element.childNodes;
  
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Handle different HTML elements
      if (tagName === 'h1') {
        result += '# ' + processHTMLForCopy(node) + '\n\n';
      } else if (tagName === 'h2') {
        result += '## ' + processHTMLForCopy(node) + '\n\n';
      } else if (tagName === 'h3') {
        result += '### ' + processHTMLForCopy(node) + '\n\n';
      } else if (tagName === 'h4') {
        result += '#### ' + processHTMLForCopy(node) + '\n\n';
      } else if (tagName === 'p') {
        result += processHTMLForCopy(node) + '\n\n';
      } else if (tagName === 'strong') {
        result += '**' + processHTMLForCopy(node) + '**';
      } else if (tagName === 'em') {
        result += '*' + processHTMLForCopy(node) + '*';
      } else if (tagName === 'ul') {
        result += processHTMLForCopy(node) + '\n';
      } else if (tagName === 'ol') {
        result += processHTMLForCopy(node) + '\n';
      } else if (tagName === 'li') {
        const parent = node.parentNode;
        if (parent.tagName.toLowerCase() === 'ul') {
          result += '- ' + processHTMLForCopy(node) + '\n';
        } else if (parent.tagName.toLowerCase() === 'ol') {
          // Find the index of this li within its parent
          let index = 1;
          let sibling = node.previousElementSibling;
          while (sibling) {
            index++;
            sibling = sibling.previousElementSibling;
          }
          result += index + '. ' + processHTMLForCopy(node) + '\n';
        } else {
          result += '- ' + processHTMLForCopy(node) + '\n';
        }
      } else {
        result += processHTMLForCopy(node);
      }
    }
  }
  
  return result;
}



// Switch between tabs and update UI
function switchTab(tabName) {
  // Remove 'active' class from all tab buttons and panes
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  tabPanes.forEach(pane => {
    pane.classList.remove('active');
    pane.setAttribute('aria-hidden', 'true');
  });

  // Add 'active' class to the selected tab button and pane
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const activePane = document.getElementById(tabName);
  if (activeBtn && activePane) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
    activePane.classList.add('active');
    activePane.setAttribute('aria-hidden', 'false');
    activeTab = tabName;
  }
}

// Shake an element to draw attention
function shakeElement(element) {
  element.classList.add('shake');
  setTimeout(() => {
    element.classList.remove('shake');
  }, 1000);
}

// Update tooltips based on current language
function updateTooltips() {
  const tooltips = {
    'language-toggle-btn': currentLanguage === 'english' ? 'Schakel naar Nederlands' : 'Switch to English',
    'save-api-key': currentLanguage === 'english' ? 'Save your API key securely in the browser' : 'Sla je API-sleutel veilig op in de browser',
    'generate-summary': currentLanguage === 'english' ? 'Generate a summary of the current page' : 'Genereer een samenvatting van de huidige pagina',
    'generate-quiz': currentLanguage === 'english' ? 'Generate quiz questions from page content' : 'Genereer quizvragen op basis van de paginainhoud',
    'generate-explanation': currentLanguage === 'english' ? 'Get explanations of complex topics' : 'Krijg uitleg over complexe onderwerpen',
    'generate-suggestions': currentLanguage === 'english' ? 'Get teaching activity suggestions' : 'Krijg suggesties voor lesactiviteiten',
    'copy-result': currentLanguage === 'english' ? 'Copy content to clipboard' : 'Kopieer inhoud naar klembord',
    'generate-custom': currentLanguage === 'english' ? 'Generate response using your custom prompt' : 'Genereer een antwoord met je aangepaste prompt'
  };
  
  // Update all tooltips
  Object.keys(tooltips).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.setAttribute('data-tooltip', tooltips[id]);
    }
  });
}

// Generate response for custom prompt
async function generateCustomResponse() {
  showLoading();
  // Get the user's custom prompt
  const prompt = customPromptInput.value.trim();
  if (!prompt) {
    hideLoading();
    resultContent.textContent = currentLanguage === 'english'
      ? 'Please enter a custom prompt.'
      : 'Voer een aangepaste prompt in.';
    resultContent.classList.add('error-text');
    shakeElement(resultContainer);
    setTimeout(() => {
      resultContent.classList.remove('error-text');
    }, 2000);
    return;
  }

  // Get current page content
  const pageContent = await getCurrentTabContent();
  let structuredContent = `Title: ${pageContent.title}\n`;
  if (pageContent.headings && pageContent.headings.h1 && pageContent.headings.h1.length > 0) {
    structuredContent += `Main Headings: ${pageContent.headings.h1.join(', ')}\n`;
  }
  if (pageContent.paragraphs && pageContent.paragraphs.length > 0) {
    structuredContent += `\nContent:\n${pageContent.paragraphs.join('\n\n')}\n`;
  } else {
    structuredContent += `\nContent:\n${pageContent.text}\n`;
  }
  // Compose the full prompt for Gemini
  const fullPrompt = `${prompt}\n\nContext:\n${structuredContent}`;
  callGemini(fullPrompt, 'custom');
};
