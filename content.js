const MAX_SCROLL_ATTEMPTS = 20;
const EXPORT_BUTTON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>`;

function getCleanText(element) {
  if (!element) return '';
  const clone = element.cloneNode(true);
  clone.querySelectorAll('button.citation-marker, .citation-marker').forEach(c => c.remove());
  return clone.innerText.trim();
}

function extractChatHistory() {
  const chatPairs = document.querySelectorAll('div.chat-message-pair');
  
  const now = new Date();
  const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
  let markdownContent = `# NotebookLM Chat Export\n*Exported at: ${dateString}*\n\n---\n\n`;

  chatPairs.forEach(pair => {
    const userMessageContainer = pair.querySelector('.from-user-container .message-text-content');
    const aiMessageContainer = pair.querySelector('.to-user-container .message-text-content');

    const userText = getCleanText(userMessageContainer);
    if (userText) {
      markdownContent += `**User:**\n${userText}\n\n`;
    }

    const aiText = getCleanText(aiMessageContainer);
    if (aiText) {
      markdownContent += `**AI:**\n${aiText}\n\n`;
    }
  });

  return markdownContent.trim();
}

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function autoScrollToTop() {
  const containers = [
    document.querySelector('div.chat-panel-content'),
    document.querySelector('section.chat-panel'),
    document.querySelector('div.panel-container'),
    document.querySelector('div.app-body')
  ];
  
  let scrollContainer = null;
  for (const c of containers) {
    if (c && c.scrollHeight > c.clientHeight) {
      scrollContainer = c;
      break;
    }
  }
  
  if (!scrollContainer) return;

  let previousHeight = scrollContainer.scrollHeight;
  let unchangedCount = 0;
  let scrollAttempts = 0;
  
  while (unchangedCount < 2 && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    scrollContainer.scrollTop = 0;
    await new Promise(resolve => setTimeout(resolve, 800));
    scrollAttempts++;
    
    if (scrollContainer.scrollHeight > previousHeight) {
      previousHeight = scrollContainer.scrollHeight;
      unchangedCount = 0;
    } else {
      unchangedCount++;
    }
  }
  
  scrollContainer.scrollTop = scrollContainer.scrollHeight;
}

async function handleExportClick(event) {
  const button = event.currentTarget;
  button.style.opacity = '0.5';
  button.style.pointerEvents = 'none';

  try {
    await autoScrollToTop();

    const chatMarkdown = extractChatHistory();
    if (chatMarkdown) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const filename = `notebooklm-chat-${dd}-${mm}-${yyyy}-${hh}-${min}.md`;
      downloadMarkdown(chatMarkdown, filename);
    } else {
      alert('No chat history found to export.');
    }
  } catch (err) {
    console.error('[NotebookLM Exporter]', err);
    alert('Export failed. Check the console for details.');
  }

  button.style.opacity = '1';
  button.style.pointerEvents = 'auto';
}

function injectExportButton() {
  const configureButtonSpan = document.querySelector('span.chat-header-buttons');
  
  if (!configureButtonSpan) {
    return;
  }

  if (document.getElementById('notebooklm-export-btn')) {
    return;
  }

  const exportButton = document.createElement('button');
  const configureButton = configureButtonSpan.querySelector('.configure-settings-button');
  
  exportButton.id = 'notebooklm-export-btn';
  exportButton.className = 'notebooklm-exporter-btn';
  exportButton.title = 'Export chat history';
  exportButton.innerHTML = EXPORT_BUTTON_SVG;
  exportButton.addEventListener('click', handleExportClick);

  if (configureButton) {
    configureButtonSpan.insertBefore(exportButton, configureButton);
  } else {
    configureButtonSpan.prepend(exportButton);
  }
}

let debounceTimer;
const observer = new MutationObserver((mutations) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (!document.getElementById('notebooklm-export-btn')) {
      injectExportButton();
    }
  }, 500);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
