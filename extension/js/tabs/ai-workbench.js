/**
 * ai-workbench.js
 * Tab 3: AI Prompt Workbench & Multi-Model Command Deck
 */

import { store } from '../store.js';

export function renderAIWorkbench(container) {
  const prompts = store.getAllPrompts();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Multi-Model Launch Deck -->
      <div class="bento-card span-12" style="background: linear-gradient(135deg, var(--bg-surface) 60%, rgba(168, 85, 247, 0.08) 100%);">
        <div class="card-header">
          <div class="card-title-group">
            <span class="card-icon-pill" style="color: var(--violet-primary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
              </svg>
            </span>
            <div>
              <div class="card-title" style="font-size: 18px;">AI Model Command Deck</div>
              <div style="font-size: 12px; color: var(--text-muted);">Launch top frontier reasoning & vision models instantly</div>
            </div>
          </div>
          <button class="btn-secondary" id="btn-open-add-prompt" style="background: var(--violet-primary); color: #07090e; font-weight: 700; border: none;">
            + Add Prompt Template
          </button>
        </div>

        <div class="shortcuts-row" style="margin-top: 10px;">
          <a href="https://claude.ai/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=claude.ai&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">Claude</span>
          </a>
          <a href="https://chatgpt.com/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">ChatGPT</span>
          </a>
          <a href="https://www.google.com/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=google.com&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">Google AI</span>
          </a>
          <a href="https://aistudio.google.com/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=aistudio.google.com&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">AI Studio</span>
          </a>
          <a href="https://chat.deepseek.com/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=deepseek.com&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">DeepSeek</span>
          </a>
          <a href="https://www.maket.ai/" class="shortcut-item" target="_blank" rel="noopener noreferrer">
            <img src="https://www.google.com/s2/favicons?domain=maket.ai&sz=128" class="shortcut-icon" alt="" />
            <span class="shortcut-name">Maket AI</span>
          </a>
        </div>
      </div>

      <!-- Prompt Category Filters & Search -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div class="preset-pills" id="prompt-filters">
          <button class="preset-pill active" data-cat="all" style="background: var(--violet-primary); color: #07090e;">All Vaults (${prompts.length})</button>
          <button class="preset-pill" data-cat="Architecture & Archviz">Architecture</button>
          <button class="preset-pill" data-cat="Unreal Engine & Technical">Unreal Engine</button>
          <button class="preset-pill" data-cat="ComfyUI & Generative AI">ComfyUI & Flux</button>
          <button class="preset-pill" data-cat="Web & Code Engineering">Engineering</button>
        </div>
        <div style="width: 260px;">
          <input type="text" id="prompt-search-input" class="calc-input" placeholder="Filter prompt snippets..." />
        </div>
      </div>

      <!-- Prompt Cards Grid -->
      <div class="prompt-vault-grid" id="prompt-cards-container">
        ${renderPromptCards(prompts)}
      </div>
    </div>

    <!-- Modal for adding custom prompt -->
    <div class="modal-overlay" id="add-prompt-modal">
      <div class="modal-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div class="card-title" style="font-size: 16px;">Add New Prompt Template</div>
          <button id="btn-close-modal" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px;">✕</button>
        </div>
        <form id="add-prompt-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Category</label>
            <select id="modal-prompt-cat" class="calc-input" style="width: 100%; background: var(--bg-card);">
              <option value="Architecture & Archviz">Architecture & Archviz</option>
              <option value="Unreal Engine & Technical">Unreal Engine & Technical</option>
              <option value="ComfyUI & Generative AI">ComfyUI & Generative AI</option>
              <option value="Web & Code Engineering">Web & Code Engineering</option>
              <option value="Custom Ideas">Custom Ideas</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Template Title</label>
            <input type="text" id="modal-prompt-title" class="calc-input" placeholder="e.g. Master Photoreal Lumen Lighting" required style="width: 100%;" />
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Prompt Body</label>
            <textarea id="modal-prompt-body" class="scratchpad-textarea" style="min-height: 100px; width: 100%;" placeholder="Enter your prompt text here..." required></textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
            <button type="button" class="btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn-secondary" style="background: var(--violet-primary); color: #07090e; font-weight: 700; border: none;">Save to Vault</button>
          </div>
        </form>
      </div>
    </div>
  `;

  bindAIWorkbenchEvents(container);
}

function renderPromptCards(prompts) {
  return prompts.map(p => `
    <div class="prompt-card" data-category="${p.category}" data-title="${p.title.toLowerCase()}">
      <div>
        <div class="prompt-category-tag">${p.category}</div>
        <div class="card-title" style="margin-top: 4px; font-size: 15px;">${p.title}</div>
      </div>
      <div class="prompt-text">${p.prompt}</div>
      <button class="btn-copy-prompt" data-prompt="${encodeURIComponent(p.prompt)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
        Copy Prompt
      </button>
    </div>
  `).join('');
}

function bindAIWorkbenchEvents(container) {
  const cardsContainer = container.querySelector('#prompt-cards-container');
  const searchInput = container.querySelector('#prompt-search-input');
  const filterButtons = container.querySelectorAll('#prompt-filters .preset-pill');

  // Copy Prompt handler
  container.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.btn-copy-prompt');
    if (copyBtn) {
      const text = decodeURIComponent(copyBtn.dataset.prompt);
      await navigator.clipboard.writeText(text);
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copied to Clipboard!';
      copyBtn.style.background = 'var(--emerald-primary)';
      copyBtn.style.color = '#07090e';
      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
      }, 1600);
    }
  });

  // Filter pills
  let activeCat = 'all';
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--violet-primary)';
      btn.style.color = '#07090e';
      activeCat = btn.dataset.cat;
      filterCards();
    });
  });

  // Search input
  searchInput.addEventListener('input', () => {
    filterCards();
  });

  const filterCards = () => {
    const query = searchInput.value.toLowerCase().trim();
    const cards = cardsContainer.querySelectorAll('.prompt-card');
    cards.forEach(card => {
      const matchCat = activeCat === 'all' || card.dataset.category === activeCat;
      const matchText = !query || card.innerText.toLowerCase().includes(query);
      card.style.display = matchCat && matchText ? 'flex' : 'none';
    });
  };

  // Modal logic
  const modal = container.querySelector('#add-prompt-modal');
  const btnOpenModal = container.querySelector('#btn-open-add-prompt');
  const btnCloseModal = container.querySelector('#btn-close-modal');
  const btnCancelModal = container.querySelector('#btn-cancel-modal');
  const addForm = container.querySelector('#add-prompt-form');

  const openModal = () => modal.classList.add('open');
  const closeModal = () => modal.classList.remove('open');

  btnOpenModal.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = container.querySelector('#modal-prompt-cat').value;
    const title = container.querySelector('#modal-prompt-title').value.trim();
    const body = container.querySelector('#modal-prompt-body').value.trim();

    if (title && body) {
      store.addCustomPrompt({
        id: `p-${Date.now()}`,
        category: cat,
        title: title,
        prompt: body
      });
      closeModal();
      addForm.reset();
      // Re-render cards
      cardsContainer.innerHTML = renderPromptCards(store.getAllPrompts());
    }
  });
}
