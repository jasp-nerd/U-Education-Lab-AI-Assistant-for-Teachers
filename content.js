// Enhanced content script for VU Education Lab AI Assistant
// Runs in the context of web pages

// Global variables
let vuHighlightStyle = null;
let vuDraggableWindow = null;
let vuFloatingIcon = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "getPageContent":
      sendResponse({ content: extractStructuredContent() });
      return true;
    case "highlightText":
      highlightText(request.text);
      sendResponse({ success: true });
      return true;
    case "clearHighlights":
      clearHighlights();
      sendResponse({ success: true });
      return true;
    default:
      break;
  }
});

// Listen for messages from iframe
window.addEventListener('message', (event) => {
  // Allow messages from extension iframe as well as same origin
  const extensionOrigin = chrome.runtime.getURL('').replace(/\/$/, '');
  if (
    event.origin !== window.location.origin &&
    event.origin !== extensionOrigin
  ) return;

  switch (event.data.action) {
    case 'requestPageContent': {
      // Extract content and send back to iframe
      const content = extractStructuredContent();
      // Send the content back to the iframe
      if (vuDraggableWindow) {
        const iframe = vuDraggableWindow.querySelector('iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'receivePageContent',
            content
          }, '*');
        }
      }
      break;
    }
    case 'highlightText':
      highlightText(event.data.text);
      break;
    case 'clearHighlights':
      clearHighlights();
      break;
    default:
      break;
  }
});

// Function to detect if current page is a PDF
function isPDFPage() {
  // Check if URL ends with .pdf
  if (window.location.href.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  // Check if Chrome PDF viewer is present
  // Chrome's PDF viewer has specific elements
  const pdfViewer = document.querySelector('embed[type="application/pdf"]') ||
                    document.querySelector('iframe[src*=".pdf"]') ||
                    document.querySelector('.plugin') ||
                    document.querySelector('#plugin');
  
  if (pdfViewer) {
    return true;
  }
  
  // Check for PDF.js viewer elements (Chrome uses PDF.js internally)
  const textLayer = document.querySelector('.textLayer');
  const pdfContainer = document.querySelector('#viewer') || document.querySelector('.pdfViewer');
  
  if (textLayer || pdfContainer) {
    return true;
  }
  
  // Check content type
  const contentType = document.contentType;
  if (contentType && contentType.toLowerCase().includes('application/pdf')) {
    return true;
  }
  
  return false;
}

// Function to extract text from Chrome's PDF viewer
function extractPDFText() {
  const textContent = [];
  
  // Chrome's PDF viewer renders text in .textLayer elements
  // Each page has its own textLayer with text spans
  const textLayers = document.querySelectorAll('.textLayer');
  
  if (textLayers.length > 0) {
    textLayers.forEach(layer => {
      const spans = layer.querySelectorAll('span');
      spans.forEach(span => {
        const text = span.textContent?.trim();
        if (text && text.length > 0) {
          textContent.push(text);
        }
      });
    });
  } else {
    // Fallback: try to find text in common PDF viewer structures
    // Some PDF viewers render text directly in the body
    const allText = document.body.innerText || document.body.textContent;
    if (allText && allText.trim().length > 100) {
      // If we have substantial text, it's likely from a PDF
      textContent.push(allText);
    }
  }
  
  return textContent.join('\n\n');
}

// Function to extract structured content from the page
function extractStructuredContent() {
  // Check if this is a PDF page first
  if (isPDFPage()) {
    console.log('VU AI Assistant: Detected PDF page, extracting PDF content...');
    const pdfText = extractPDFText();
    
    // Count text layers for page count estimation
    const textLayers = document.querySelectorAll('.textLayer');
    
    if (!pdfText || pdfText.trim().length === 0) {
      console.warn('VU AI Assistant: Could not extract text from PDF');
      return {
        title: document.title || 'PDF Document',
        url: window.location.href,
        isPDF: true,
        pdfExtractionFailed: true,
        paragraphs: [],
        headings: { h1: [], h2: [], h3: [] },
        stats: {
          paragraphsCount: 0,
          headingsTotal: 0,
          pdfPageCount: textLayers.length || 0
        }
      };
    }
    
    // Split PDF text into paragraphs (double newlines or long lines)
    const paragraphs = pdfText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .slice(0, 500); // Limit paragraphs
    
    // Try to identify headings (lines that are short and might be headings)
    const lines = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const headings = {
      h1: [],
      h2: [],
      h3: []
    };
    
    // Simple heuristic: lines that are shorter and appear before paragraphs might be headings
    lines.forEach((line, index) => {
      if (line.length < 100 && line.length > 3) {
        // Check if next line is longer (likely a paragraph)
        if (index < lines.length - 1 && lines[index + 1].length > line.length * 2) {
          if (headings.h1.length < 50) {
            headings.h1.push(line);
          } else if (headings.h2.length < 50) {
            headings.h2.push(line);
          } else if (headings.h3.length < 50) {
            headings.h3.push(line);
          }
        }
      }
    });
    
    return {
      title: document.title || 'PDF Document',
      url: window.location.href,
      isPDF: true,
      paragraphs: paragraphs,
      headings: headings,
      pdfText: pdfText.substring(0, 1000000), // Full text, limited to 1MB
      stats: {
        paragraphsCount: paragraphs.length,
        headingsTotal: headings.h1.length + headings.h2.length + headings.h3.length,
        pdfPageCount: textLayers.length || 0
      }
    };
  }
  
  // Constants for content limits
  // AI models (GPT-5) support 256K tokens (~1MB text), so we set generous limits
  const MAX_PARAGRAPHS = 500;
  const MAX_HEADINGS_PER_TYPE = 200;
  const MAX_LISTS = 100;
  const MAX_IMAGES = 100;
  const MAX_TABLES = 50;
  const MAX_LINKS = 200;
  const MAX_CODE_BLOCKS = 50;
  const MAX_TEXT_LENGTH = 1000000; // 1MB max (~250K tokens)

  // Try to find main content area to avoid navigation/UI pollution
  const mainContent = document.querySelector('main, article, [role="main"], .content, #content, #main');
  const contentRoot = mainContent || document.body;

  const pageInfo = {
    title: document.title,
    url: window.location.href,
    // REMOVED: text: document.body.innerText - this was causing massive duplication
  };

  // Extract headings for better structure (limit to avoid huge pages)
  const headings = {
    h1: Array.from(contentRoot.querySelectorAll('h1'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE),
    h2: Array.from(contentRoot.querySelectorAll('h2'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE),
    h3: Array.from(contentRoot.querySelectorAll('h3'))
      .map(el => el.innerText?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, MAX_HEADINGS_PER_TYPE)
  };

  // Extract paragraphs for better content analysis (with limits)
  const paragraphs = Array.from(contentRoot.querySelectorAll('p'))
    .map(el => el.innerText?.trim())
    .filter(text => text && text.length > 0)
    .slice(0, MAX_PARAGRAPHS);

  // Extract lists - FIXED: Use direct children only to avoid nested list duplication
  const lists = Array.from(contentRoot.querySelectorAll('ul, ol'))
    .map(list => ({
      type: list.tagName.toLowerCase(),
      items: Array.from(list.children)
        .filter(el => el.tagName === 'LI')
        .map(li => li.innerText?.trim())
        .filter(text => text && text.length > 0)
    }))
    .filter(list => list.items.length > 0)
    .slice(0, MAX_LISTS);

  // Extract images - FIXED: Include all images, not just those with alt text
  const images = Array.from(contentRoot.querySelectorAll('img'))
    .map(img => ({
      alt: img.alt?.trim() || '[No alt text]',
      src: img.src,
      hasAlt: !!(img.alt?.trim())
    }))
    .filter(img => img.src && !img.src.startsWith('data:')) // Skip tiny data URLs
    .slice(0, MAX_IMAGES);

  // Extract important links with context
  const links = Array.from(contentRoot.querySelectorAll('a[href]'))
    .filter(link => {
      const href = link.href;
      return href && 
             !href.startsWith('javascript:') && 
             !href.startsWith('#') &&
             link.innerText?.trim();
    })
    .map(link => ({
      text: link.innerText.trim(),
      href: link.href,
      isExternal: !link.href.startsWith(window.location.origin)
    }))
    .slice(0, MAX_LINKS);

  // Extract tables with improved structure
  const tables = Array.from(contentRoot.querySelectorAll('table'))
    .map(table => {
      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.innerText?.trim())
        .filter(text => text);
      const rows = Array.from(table.querySelectorAll('tbody tr, tr'))
        .map(tr => {
          const cells = Array.from(tr.querySelectorAll('td'))
            .map(td => td.innerText?.trim())
            .filter(text => text);
          if (cells.length === 0) return null;
          
          // If we have headers and same number of cells, create object
          if (headers.length > 0 && headers.length === cells.length) {
            return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
          }
          return cells;
        })
        .filter(row => row !== null);
      
      return {
        headers,
        rows,
        hasHeaders: headers.length > 0,
        rowCount: rows.length
      };
    })
    .filter(table => table.rows.length > 0)
    .slice(0, MAX_TABLES);

  // Extract code blocks for technical/educational content
  const codeBlocks = Array.from(contentRoot.querySelectorAll('pre code, pre, code'))
    .map(code => {
      const text = code.innerText?.trim();
      if (!text || text.length < 10) return null; // Skip very short snippets
      
      return {
        text: text.substring(0, 5000), // Limit individual code blocks
        language: code.className.match(/language-(\w+)/)?.[1] || 
                  code.parentElement?.className.match(/language-(\w+)/)?.[1] || 
                  'unknown'
      };
    })
    .filter(block => block !== null)
    .slice(0, MAX_CODE_BLOCKS);

  // Extract meta description if available
  let metaDescription = "";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDescription = metaDesc.getAttribute("content") || "";

  // Extract additional metadata
  const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content") || "";
  const author = document.querySelector('meta[name="author"]')?.getAttribute("content") || "";
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogType = document.querySelector('meta[property="og:type"]')?.getAttribute("content") || "";

  // Assemble final result
  const result = {
    ...pageInfo,
    metaDescription,
    metaKeywords,
    author,
    ogTitle,
    ogType,
    headings,
    paragraphs,
    lists,
    images,
    links,
    tables,
    codeBlocks,
    stats: {
      headingsTotal: headings.h1.length + headings.h2.length + headings.h3.length,
      paragraphsCount: paragraphs.length,
      listsCount: lists.length,
      imagesCount: images.length,
      linksCount: links.length,
      tablesCount: tables.length,
      codeBlocksCount: codeBlocks.length
    }
  };

  // Estimate total size and truncate if needed
  const resultStr = JSON.stringify(result);
  if (resultStr.length > MAX_TEXT_LENGTH) {
    console.warn(`VU AI Assistant: Content too large (${resultStr.length} chars), truncating...`);
    
    // Progressively remove less important content (should rarely happen with 1MB limit)
    if (result.codeBlocks.length > 30) result.codeBlocks = result.codeBlocks.slice(0, 30);
    if (result.links.length > 100) result.links = result.links.slice(0, 100);
    if (result.tables.length > 30) result.tables = result.tables.slice(0, 30);
    if (result.paragraphs.length > 300) result.paragraphs = result.paragraphs.slice(0, 300);
    
    // Update stats
    result.stats.truncated = true;
  }

  return result;
}

// Function to highlight text on the page
function highlightText(text) {
  if (!text) return;
  
  // Clear any existing highlights first
  clearHighlights();
  
  const regex = new RegExp(text, 'gi');
  const walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_TEXT, 
    null, 
    false
  );
  
  const nodesToHighlight = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.match(regex)) {
      nodesToHighlight.push(node);
    }
  }
  
  nodesToHighlight.forEach(node => {
    const highlightedContent = node.nodeValue.replace(
      regex, 
      match => `<span class="vu-ai-highlight">${match}</span>`
    );
    
    const span = document.createElement('span');
    span.innerHTML = highlightedContent;
    node.parentNode.replaceChild(span, node);
  });
  
  // Add highlight style if not already added
  if (!vuHighlightStyle) {
    vuHighlightStyle = document.createElement('style');
    vuHighlightStyle.textContent = `
      .vu-ai-highlight {
        background-color: #0077B3;
        color: white;
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(vuHighlightStyle);
  }
}

// Function to clear all highlights
function clearHighlights() {
  const highlights = document.querySelectorAll('.vu-ai-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    const text = document.createTextNode(highlight.textContent);
    parent.replaceChild(text, highlight);
  });
}

// Utility functions for chrome.storage.local
async function saveFloatingIconState(state) {
  return new Promise(resolve => {
    chrome.storage.local.set({ vuFloatingIconState: state }, resolve);
  });
}
async function getFloatingIconState() {
  return new Promise(resolve => {
    chrome.storage.local.get(['vuFloatingIconState'], result => {
      resolve(result.vuFloatingIconState || null);
    });
  });
}

// Create floating icon
async function createFloatingIcon() {
  // Check if icon already exists
  if (vuFloatingIcon) {
    return vuFloatingIcon;
  }

  // Create the floating icon
  const icon = document.createElement('button');
  icon.className = 'vu-ai-floating-icon';
  icon.setAttribute('aria-label', 'Open VU Education Lab Assistant');
  icon.setAttribute('title', 'Open VU Education Lab AI Assistant');
  icon.style.transition = 'all 0.3s cubic-bezier(.4,2,.6,1)';
  icon.style.position = 'fixed';
  icon.style.zIndex = 10000;

  // Create the icon image
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('images/icon48.png');
  img.alt = 'VU Education Lab AI Assistant';
  img.style.transition = 'opacity 0.2s, width 0.2s, height 0.2s';
  img.draggable = false; // Prevent native image drag behavior
  img.style.pointerEvents = 'none'; // Let clicks/drags pass through to the button
  icon.appendChild(img);

  // Add click event to show draggable window
  icon.addEventListener('click', (e) => {
    if (icon.classList.contains('minimized')) return; // Don't open if minimized
    toggleDraggableWindow();
  });

  // Add the icon to the page
  document.body.appendChild(icon);
  vuFloatingIcon = icon;

  // Restore position and minimized state from chrome.storage.local
  let iconState = await getFloatingIconState();
  if (iconState) {
    setFloatingIconPosition(icon, iconState.left, iconState.top, iconState.edge, iconState.minimized, true);
    if (iconState.minimized) {
      minimizeFloatingIcon(true);
    }
  }

  // Make draggable
  makeFloatingIconDraggable(icon);

  // Auto-minimize after inactivity
  let minimizeTimeout;
  function resetMinimizeTimer() {
    clearTimeout(minimizeTimeout);
    if (!icon.classList.contains('minimized')) {
      minimizeTimeout = setTimeout(() => minimizeFloatingIcon(), 3000);
    }
  }
  icon.addEventListener('mousemove', resetMinimizeTimer);
  icon.addEventListener('mousedown', resetMinimizeTimer);
  icon.addEventListener('mouseup', resetMinimizeTimer);
  icon.addEventListener('mouseleave', resetMinimizeTimer);
  icon.addEventListener('mouseenter', () => {
    if (icon.classList.contains('minimized')) {
      restoreFloatingIcon();
    }
    clearTimeout(minimizeTimeout);
  });
  icon.addEventListener('mouseleave', resetMinimizeTimer);
  // Start timer on creation
  resetMinimizeTimer();

  return icon;
}

function setFloatingIconPosition(icon, left, top, edge, minimized, skipSave) {
  // Clamp to viewport
  const minTop = 10;
  const maxTop = window.innerHeight - 58;
  top = Math.max(minTop, Math.min(maxTop, top || window.innerHeight - 68));
  if (edge === 'left') {
    icon.style.left = '20px';
    icon.style.right = '';
  } else {
    icon.style.left = '';
    icon.style.right = '20px';
  }
  icon.style.top = top + 'px';
  icon.style.bottom = '';
  if (typeof minimized === 'undefined') minimized = icon.classList.contains('minimized');
  if (!skipSave) {
    saveFloatingIconState({ left, top, edge, minimized });
  }
}

function makeFloatingIconDraggable(icon) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  let edge = 'right';

  icon.onmousedown = function (e) {
    if (icon.classList.contains('minimized')) return;
    e.preventDefault(); // Prevent native image drag behavior
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = icon.offsetLeft;
    startTop = icon.offsetTop;
    document.body.style.userSelect = 'none';
    document.onmousemove = drag;
    document.onmouseup = stopDrag;
  };

  function drag(e) {
    if (!isDragging) return;
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    // Clamp to viewport
    newTop = Math.max(10, Math.min(window.innerHeight - 58, newTop));
    newLeft = Math.max(0, Math.min(window.innerWidth - 48, newLeft));
    icon.style.left = newLeft + 'px';
    icon.style.top = newTop + 'px';
    icon.style.right = '';
    icon.style.bottom = '';
  }

  function stopDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = '';
    document.onmousemove = null;
    document.onmouseup = null;
    // Snap to nearest edge
    let left = icon.offsetLeft;
    let edgeToSnap = (left < window.innerWidth / 2) ? 'left' : 'right';
    if (edgeToSnap === 'left') {
      icon.style.left = '20px';
      icon.style.right = '';
      edge = 'left';
    } else {
      icon.style.left = '';
      icon.style.right = '20px';
      edge = 'right';
    }
    let top = icon.offsetTop;
    setFloatingIconPosition(icon, left, top, edge);
  }
}

function minimizeFloatingIcon(instant) {
  if (!vuFloatingIcon) return;
  vuFloatingIcon.classList.add('minimized');
  vuFloatingIcon.style.width = '20px';
  vuFloatingIcon.style.height = '20px';
  vuFloatingIcon.style.borderRadius = '50%';
  vuFloatingIcon.style.overflow = 'hidden';
  vuFloatingIcon.style.opacity = '0.5';
  vuFloatingIcon.style.background = 'var(--vu-blue)';
  if (vuFloatingIcon.firstChild && vuFloatingIcon.firstChild.tagName === 'IMG') {
    vuFloatingIcon.firstChild.style.opacity = '0';
    vuFloatingIcon.firstChild.style.width = '0';
    vuFloatingIcon.firstChild.style.height = '0';
  }
  // Save state
  let left = vuFloatingIcon.offsetLeft;
  let top = vuFloatingIcon.offsetTop;
  let edge = (left < window.innerWidth / 2) ? 'left' : 'right';
  setFloatingIconPosition(vuFloatingIcon, left, top, edge, true);
}

function restoreFloatingIcon() {
  if (!vuFloatingIcon) return;
  vuFloatingIcon.classList.remove('minimized');
  vuFloatingIcon.style.width = '48px';
  vuFloatingIcon.style.height = '48px';
  vuFloatingIcon.style.borderRadius = '50%';
  vuFloatingIcon.style.opacity = '1';
  vuFloatingIcon.style.background = 'var(--vu-blue)';
  if (vuFloatingIcon.firstChild && vuFloatingIcon.firstChild.tagName === 'IMG') {
    vuFloatingIcon.firstChild.style.opacity = '1';
    vuFloatingIcon.firstChild.style.width = '28px';
    vuFloatingIcon.firstChild.style.height = '28px';
  }
  // Save state
  let left = vuFloatingIcon.offsetLeft;
  let top = vuFloatingIcon.offsetTop;
  let edge = (left < window.innerWidth / 2) ? 'left' : 'right';
  setFloatingIconPosition(vuFloatingIcon, left, top, edge, false);
}

// Create draggable window
function createDraggableWindow() {
  // Check if window already exists
  if (vuDraggableWindow) {
    return vuDraggableWindow;
  }
  
  // Create the window container
  const window = document.createElement('div');
  window.className = 'vu-ai-draggable-window hidden';
  
  // Create window header
  const header = document.createElement('div');
  header.className = 'vu-ai-window-header';
  
  // Add title
  const title = document.createElement('h1');
  title.className = 'vu-ai-window-title';
  title.textContent = 'VU Education Lab AI Assistant';
  
  // Add window actions
  const actions = document.createElement('div');
  actions.className = 'vu-ai-window-actions';
  
  // Add minimize button
  const minimizeBtn = document.createElement('button');
  minimizeBtn.className = 'vu-ai-window-button';
  minimizeBtn.innerHTML = '&minus;';
  minimizeBtn.setAttribute('aria-label', 'Minimize');
  minimizeBtn.setAttribute('title', 'Minimize');
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'vu-ai-window-button';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.setAttribute('title', 'Close');
  
  // Add buttons to actions
  actions.appendChild(minimizeBtn);
  actions.appendChild(closeBtn);
  
  // Add title and actions to header
  header.appendChild(title);
  header.appendChild(actions);
  
  // Create window content
  const content = document.createElement('div');
  content.className = 'vu-ai-window-content';
  
  // Create iframe for extension popup
  const iframe = document.createElement('iframe');
  iframe.className = 'vu-ai-window-iframe';
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  
  // Add iframe to content
  content.appendChild(iframe);
  
  // Add header and content to window
  window.appendChild(header);
  window.appendChild(content);
  
  // Add window to the page
  document.body.appendChild(window);
  
  // Store reference
  vuDraggableWindow = window;
  
  // Add event listeners for drag functionality
  makeDraggable(window, header);
  
  // Add event listeners for buttons
  minimizeBtn.addEventListener('click', () => {
    hideDraggableWindow();
  });
  
  closeBtn.addEventListener('click', () => {
    hideDraggableWindow();
  });
  
  return window;
}

// Make an element draggable
function makeDraggable(element, handle) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    // Get the initial mouse cursor position
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new cursor position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    // Remove bottom positioning if dragged
    element.style.bottom = 'auto';
    element.style.right = 'auto';
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Toggle the draggable window
function toggleDraggableWindow() {
  if (!vuDraggableWindow) {
    createDraggableWindow();
  }
  
  if (vuDraggableWindow.classList.contains('hidden')) {
    showDraggableWindow();
  } else {
    hideDraggableWindow();
  }
}

// Show the draggable window
function showDraggableWindow() {
  // Create if not exists
  if (!vuDraggableWindow) {
    createDraggableWindow();
  }
  
  // Remove hidden class
  vuDraggableWindow.classList.remove('hidden');
  
  // Position window if not already positioned
  if (!vuDraggableWindow.style.top && !vuDraggableWindow.style.left) {
    // Default to centered position
    vuDraggableWindow.style.top = '50%';
    vuDraggableWindow.style.left = '50%';
    vuDraggableWindow.style.transform = 'translate(-50%, -50%)';
  }
}

// Hide the draggable window
function hideDraggableWindow() {
  if (vuDraggableWindow) {
    vuDraggableWindow.classList.add('hidden');
  }
}

// Check if the current page is likely educational or informational
function isEducationalPage() {
  // PDFs are often educational/informational content
  if (isPDFPage()) {
    return true;
  }
  
  // Domains commonly used for educational or informational purposes
  const educationalDomains = [
    '.edu', '.ac.', 'scholar.', 'academic.', 'research.', 'science.',
    'learning.', 'study.', 'course.', 'class.', 'lecture.', 'school.',
    'university.', 'college.', 'academy.', 'institute.', 'faculty.',
    '.org', '.gov', '.info', 'wikipedia.', 'encyclopedia.', 'khanacademy.', 'britannica.'
  ];

  // Keywords that suggest informational or article content
  const infoKeywords = [
    'education', 'learning', 'academic', 'course', 'study', 'research', 'school', 'university', 'college', 'lecture', 'class',
    'article', 'blog', 'news', 'how to', 'guide', 'tutorial', 'encyclopedia', 'reference', 'explanation', 'information', 'faq', 'summary', 'lesson', 'curriculum', 'report', 'analysis', 'review', 'insight', 'explained'
  ];

  const url = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const metaTags = document.querySelectorAll('meta[name="keywords"], meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]');
  const metaContent = Array.from(metaTags).map(tag => tag.getAttribute('content') || '').join(' ').toLowerCase();

  // Check domain
  const isEduDomain = educationalDomains.some(domain => url.includes(domain));

  // Check meta content and URL for keywords
  const hasInfoKeywords = infoKeywords.some(keyword => metaContent.includes(keyword) || pathname.includes(keyword));

  // Check for article-like structure
  const hasArticleTag = document.querySelector('article, main, section');
  const hasHeadings = document.querySelector('h1, h2');
  const wordCount = document.body.innerText.split(/\s+/).length;

  // Check for Open Graph type article
  const ogType = document.querySelector('meta[property="og:type"]');
  const isOGArticle = ogType && ogType.getAttribute('content') && ogType.getAttribute('content').toLowerCase().includes('article');

  // Heuristic: If the page has a lot of text and at least one heading, it's likely informational
  const isLongInformational = wordCount > 500 && hasHeadings;

  // Return true if any of the above criteria are met
  return (
    isEduDomain ||
    hasInfoKeywords ||
    hasArticleTag ||
    isOGArticle ||
    isLongInformational
  );
}

// Initialize content script
async function initialize() {
  console.log('VU Education Lab AI Assistant content script loaded');
  if (isEducationalPage()) {
    chrome.storage.local.get(['show_floating_popup'], (result) => {
      const showFloating = result.show_floating_popup !== false; // default true
      if (showFloating) {
        setTimeout(() => {
          createFloatingIcon();
        }, 1500);
      }
    });
  }
}

// Run initialization
initialize();
