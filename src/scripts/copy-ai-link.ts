// Wire up every [data-copy-ai] button to copy its URL (an LLM-readable .md/.txt
// resource) to the clipboard, with a brief confirmation label swap.
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-copy-ai]');
buttons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const url = btn.dataset.copyAi;
    const done = btn.dataset.copiedLabel ?? '';
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      const original = btn.textContent;
      btn.textContent = done;
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  });
});
