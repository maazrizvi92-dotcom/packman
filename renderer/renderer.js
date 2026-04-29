const { jsPDF } = window.jspdf;
const { Document, Packer, Paragraph } = window.docx;

const promptInput = document.getElementById('promptInput');
const toneSelect = document.getElementById('toneSelect');
const generateBtn = document.getElementById('generateBtn');
const resultContainer = document.getElementById('resultContainer');
const resultText = document.getElementById('resultText');
const saveBtn = document.getElementById('saveBtn');
const exportDocxBtn = document.getElementById('exportDocxBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const templateSelect = document.getElementById('templateSelect');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const historySidebar = document.getElementById('historySidebar');
const historySearch = document.getElementById('historySearch');
const loadingSpinner = document.getElementById('loadingSpinner');
const copyBtn = document.getElementById('copyBtn');

const STORAGE_KEY = 'geminiHistory';

// Template selection
templateSelect?.addEventListener('change', () => {
  const value = templateSelect.value;
  if (value) {
    promptInput.value = value;
    promptInput.focus();
  }
});

// Spinner handling
function showLoading() {
  loadingSpinner.classList.remove('hidden');
  resultText.style.display = 'none';
  copyBtn.style.display = 'none';
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
  resultText.style.display = 'block';
  copyBtn.style.display = 'inline-block';
}

// Display response with markdown-like formatting
function showFullResponse(text) {
  resultText.innerHTML = '';
  const lines = text.split('\n');

  for (let line of lines) {
    let el;
    if (line.startsWith('### ')) {
      el = document.createElement('div');
      el.className = 'text-sm font-semibold bg-yellow-100 text-yellow-800 rounded px-2 py-1 my-2';
      el.textContent = line.slice(4);
    } else if (line.startsWith('## ')) {
      el = document.createElement('div');
      el.className = 'text-lg font-bold text-purple-700 border-b border-purple-200 my-3';
      el.textContent = line.slice(3);
    } else if (line.startsWith('# ')) {
      el = document.createElement('div');
      el.className = 'text-2xl font-extrabold text-blue-700 border-b-2 border-blue-300 pb-1 my-4';
      el.textContent = line.slice(2);
    } else if (/^(\-|\*|\d+\.)\s/.test(line)) {
      el = document.createElement('li');
      el.className = 'ml-6 list-disc text-gray-800';
      el.textContent = line.replace(/^(\-|\*|\d+\.)\s/, '');
    } else if (line.trim() === '') {
      el = document.createElement('br');
    } else {
      el = document.createElement('p');
      el.className = 'text-gray-700 mb-2';
      el.textContent = line;
    }
    resultText.appendChild(el);
  }
}

// History Helpers
function loadHistory() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const historyItems = JSON.parse(saved);
    if (Array.isArray(historyItems)) {
      historyItems.forEach(({ prompt, response, pinned }) => {
        addToHistory(prompt, response, false, pinned);
      });
    }
  } catch (err) {
    console.warn('⚠️ Failed to load saved history.');
  }
}

function saveHistory() {
  const items = [];
  historyList.querySelectorAll('li').forEach(li => {
    const promptBtn = li.querySelector('button.text-blue-700');
    const previewDiv = li.querySelector('div.mt-1');
    const isPinned = li.classList.contains('pinned');
    if (promptBtn && previewDiv) {
      const prompt = promptBtn.title || promptBtn.textContent.trim();
      const response = li.dataset.response || previewDiv.textContent.trim();
      items.push({ prompt, response, pinned: isPinned });
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.reverse()));
}

function addToHistory(prompt, response, save = true, pinned = false) {
  const item = document.createElement('li');
  item.className = 'p-2 bg-gray-50 rounded-lg border border-gray-200 shadow-sm';
  if (pinned) item.classList.add('pinned');
  const preview = response.length > 100 ? response.slice(0, 100) + '...' : response;
  item.dataset.response = response;

  item.innerHTML = `
    <div class="flex justify-between items-start">
      <button class="text-left text-blue-700 font-medium hover:underline flex-1 truncate" title="${prompt}">
        ${prompt}
      </button>
      <div class="flex items-center gap-2 ml-2">
        <button class="pin-item p-1 rounded hover:bg-yellow-100" title="Pin/Unpin">
          <svg class="w-5 h-5 pin-icon text-yellow-500" fill="${pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.862 4.487a2.25 2.25 0 0 1 3.181 3.181l-.897.897a.75.75 0 0 0 0 1.06l.99.99a.75.75 0 0 1 0 1.06l-3.6 3.6a.75.75 0 0 1-1.06 0l-.99-.99a.75.75 0 0 0-1.06 0l-.897.897a2.25 2.25 0 0 1-3.182-3.181l7.615-7.614Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 12.75 9 15" />
          </svg>
        </button>
        <button class="delete-item text-gray-400 hover:text-red-500" title="Delete">✖️</button>
      </div>
    </div>
    <div class="mt-1 text-xs text-gray-500 truncate">${preview}</div>
  `;

  // Listeners
  item.querySelector('button.text-blue-700').addEventListener('click', () => {
    showFullResponse(response);
    resultContainer.classList.remove('hidden');
  });

  item.querySelector('.delete-item').addEventListener('click', (e) => {
    e.stopPropagation();
    item.remove();
    saveHistory();
  });

  item.querySelector('.pin-item').addEventListener('click', (e) => {
    e.stopPropagation();
    item.classList.toggle('pinned');
    const svg = item.querySelector('.pin-icon');
    svg.setAttribute('fill', item.classList.contains('pinned') ? 'currentColor' : 'none');
    historyList.prepend(item); // Reorder on pin
    saveHistory();
  });

  pinned ? historyList.prepend(item) : historyList.appendChild(item);
  if (save) saveHistory();
}

// Clear All History
clearHistoryBtn?.addEventListener('click', () => {
  if (confirm("🗑️ Clear all history?")) {
    historyList.innerHTML = '';
    localStorage.removeItem(STORAGE_KEY);
  }
});

// Toggle Sidebar
toggleSidebarBtn?.addEventListener('click', () => {
  historySidebar.classList.toggle('hidden');
});

// Copy Response
copyBtn?.addEventListener('click', () => {
  const text = resultText.innerText.trim();
  if (!text) return alert("⚠️ Nothing to copy.");
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy to Clipboard', 1500);
  });
});

// Export Features
saveBtn?.addEventListener('click', () => {
  const content = resultText.innerText.trim();
  if (!content) return alert("⚠️ Nothing to save.");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "gemini-output.txt");
});

exportDocxBtn?.addEventListener('click', async () => {
  const content = resultText.innerText.trim();
  if (!content) return alert("⚠️ Nothing to export.");
  const doc = new Document({
    sections: [{
      children: content.split('\n').map(line => new Paragraph(line))
    }]
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "gemini-output.docx");
});

exportPdfBtn?.addEventListener('click', () => {
  const content = resultText.innerText.trim();
  if (!content) return alert("⚠️ Nothing to export.");
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(content, 180);
  pdf.text(lines, 10, 10);
  pdf.save("gemini-output.pdf");
});

// Search History
historySearch?.addEventListener('input', () => {
  const query = historySearch.value.toLowerCase();
  historyList.querySelectorAll('li').forEach(item => {
    const promptBtn = item.querySelector('button.text-blue-700');
    const promptText = promptBtn?.textContent.toLowerCase() || '';
    item.style.display = promptText.includes(query) ? 'block' : 'none';
  });
});

// Generate Button
generateBtn?.addEventListener('click', async () => {
  const rawPrompt = promptInput.value.trim();
  const tone = toneSelect.value || "friendly";

  if (!rawPrompt) {
    alert("⚠️ Please enter a prompt.");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  resultContainer.classList.remove('hidden');
  showLoading();

  const prompt = `
You are an expert content creator.
Your task: Generate high-quality, well-formatted content using markdown-style structure.

Prompt: "${rawPrompt}"
Tone: ${tone}
Audience: General readers, tech users, developers.
Use headings (#, ##, ###), bullet points, and short paragraphs.
  `.trim();

  try {
    const response = await window.api.generateText(prompt, tone);
    const content = response?.text || "⚠️ No response from AI.";
    hideLoading();
    showFullResponse(content);
    addToHistory(rawPrompt, content);
  } catch (err) {
    console.error("❌ Error:", err);
    hideLoading();
    showFullResponse("⚠️ An error occurred during generation.");
    alert("❌ Failed to generate content.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Content";
  }
});

// Load history on startup
loadHistory();
