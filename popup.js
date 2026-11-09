/**
 * Anti-WebP Settings Controller
 * Handles immediate preference synchronization via chrome.storage.sync
 */

document.addEventListener('DOMContentLoaded', async () => {
  const btnPng = document.getElementById('btn-png');
  const btnJpg = document.getElementById('btn-jpg');
  const qualityWrapper = document.getElementById('quality-wrapper');
  const qualitySlider = document.getElementById('quality-slider');
  const qualityVal = document.getElementById('quality-val');

  const DEFAULTS = {
    format: 'png',
    quality: 0.92
  };

  // Safe wrapper for chrome.storage.sync
  const storage = {
    get: (defaults) => new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(defaults, resolve);
      } else {
        const local = localStorage.getItem('anti_webp_prefs');
        resolve(local ? JSON.parse(local) : defaults);
      }
    }),
    set: (data) => new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(data, resolve);
      } else {
        const current = JSON.parse(localStorage.getItem('anti_webp_prefs') || '{}');
        localStorage.setItem('anti_webp_prefs', JSON.stringify({ ...current, ...data }));
        resolve();
      }
    })
  };

  function updateFormatUI(format) {
    const isJpg = format === 'jpg';
    if (isJpg) {
      btnJpg.classList.add('active');
      btnJpg.setAttribute('aria-checked', 'true');
      btnPng.classList.remove('active');
      btnPng.setAttribute('aria-checked', 'false');
      qualityWrapper.style.display = 'flex';
    } else {
      btnPng.classList.add('active');
      btnPng.setAttribute('aria-checked', 'true');
      btnJpg.classList.remove('active');
      btnJpg.setAttribute('aria-checked', 'false');
      qualityWrapper.style.display = 'none';
    }
  }

  // 1. Load saved preferences on popup open
  const prefs = await storage.get(DEFAULTS);
  updateFormatUI(prefs.format);

  const pct = Math.round((prefs.quality ?? 0.92) * 100);
  qualitySlider.value = pct;
  qualityVal.textContent = `${pct}%`;

  // 2. Format Toggle Listeners (Instant Save)
  btnPng.addEventListener('click', async () => {
    if (btnPng.classList.contains('active')) return;
    updateFormatUI('png');
    await storage.set({ format: 'png' });
  });

  btnJpg.addEventListener('click', async () => {
    if (btnJpg.classList.contains('active')) return;
    updateFormatUI('jpg');
    await storage.set({ format: 'jpg' });
  });

  // 3. Quality Slider Listeners (Live readout and instant save)
  qualitySlider.addEventListener('input', (e) => {
    qualityVal.textContent = `${e.target.value}%`;
  });

  qualitySlider.addEventListener('change', async (e) => {
    const val = parseInt(e.target.value, 10);
    const decimal = parseFloat((val / 100).toFixed(2));
    await storage.set({ quality: decimal });
  });
});
