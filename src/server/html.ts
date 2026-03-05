import { VALID_MODES, MODE_LABELS, MODE_DESCRIPTIONS, MODE_PLACEHOLDERS } from "../llm/prompts.js";
import type { AnswerMode } from "../llm/prompts.js";

const MODE_OPTIONS_HTML = VALID_MODES.map(
  (m) => `<option value="${m}">${MODE_LABELS[m as AnswerMode]}</option>`
).join("\n      ");

export const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Legacy Lens</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: sans-serif; max-width: 860px; margin: 0 auto; padding: 20px; background: #111; color: #ddd; }
    h1 { color: #f60; margin: 0 0 4px; }
    .subtitle { color: #777; margin: 0 0 20px; font-size: 14px; }
    .controls { display: flex; gap: 16px; align-items: center; margin-bottom: 10px; }
    .toggle-group { display: flex; gap: 8px; }
    .toggle-group label { cursor: pointer; padding: 4px 12px; border: 1px solid #444; border-radius: 4px; font-size: 13px; user-select: none; }
    .toggle-group label:has(input:checked) { border-color: #f60; color: #f60; }
    .toggle-group input { display: none; }
    textarea { width: 100%; background: #1a1a1a; color: #ddd; border: 1px solid #444; padding: 10px; font-size: 14px; border-radius: 4px; resize: vertical; }
    textarea:focus { outline: none; border-color: #f60; }
    #mode-description { font-size: 13px; color: #888; margin: 0 0 8px; line-height: 1.5; min-height: 1.5em; }
    .btn-row { display: flex; gap: 8px; margin-top: 8px; }
    button { padding: 8px 20px; font-size: 14px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
    #submit-btn { background: #f60; color: #000; }
    #submit-btn:disabled { background: #555; color: #888; cursor: not-allowed; }
    #clear-btn { background: #2a2a2a; color: #aaa; border: 1px solid #444; }
    #status { color: #777; font-size: 13px; margin: 10px 0 6px; min-height: 18px; }
    #mode-select { background: #1a1a1a; color: #ddd; border: 1px solid #444; border-radius: 4px; padding: 3px 8px; font-size: 13px; cursor: pointer; }
    #mode-select:focus { outline: none; border-color: #f60; }

    /* Chunks panel */
    #chunks-panel { margin: 0 0 8px; border: 1px solid #2a2a2a; border-radius: 4px; background: #161616; }
    #chunks-panel summary { padding: 6px 12px; cursor: pointer; color: #666; font-size: 12px; user-select: none; list-style: none; display: flex; align-items: center; gap: 6px; }
    #chunks-panel summary::-webkit-details-marker { display: none; }
    #chunks-panel summary::before { content: '\\25B6'; font-size: 9px; transition: transform 0.15s; }
    #chunks-panel[open] summary::before { transform: rotate(90deg); }
    #chunks-panel summary:hover { color: #999; }
    #chunks-list { padding: 4px 12px 8px; display: flex; flex-direction: column; gap: 3px; }
    .chunk-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 12px; font-family: monospace; }
    .chunk-name { color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
    .chunk-loc { color: #666; flex-shrink: 0; }
    .chunk-score { color: #f90; flex-shrink: 0; min-width: 52px; text-align: right; }

    /* Conversation thread — column-reverse so newest appears at top */
    #thread { display: flex; flex-direction: column-reverse; gap: 10px; margin-top: 10px; }
    #thread:empty { display: none; }
    .bubble { border-radius: 6px; padding: 10px 14px; line-height: 1.65; font-size: 14px; }
    .bubble-user { align-self: flex-end; background: #2a1400; border: 1px solid #f60; color: #f90; max-width: 78%; white-space: pre-wrap; word-break: break-word; }
    .bubble-assistant { align-self: stretch; background: #1a1a1a; border: 1px solid #333; }
    .bubble-assistant pre { margin: 8px 0; border-radius: 4px; overflow-x: auto; }
    .bubble-assistant p { margin: 0 0 10px; }
    .bubble-assistant p:last-child { margin-bottom: 0; }
    .bubble-assistant ul, .bubble-assistant ol { margin: 4px 0 10px; padding-left: 22px; }
    .bubble-assistant li { margin-bottom: 5px; }
    .bubble-assistant h1, .bubble-assistant h2, .bubble-assistant h3 { color: #f90; margin: 12px 0 6px; }
    .bubble-assistant code:not([class*="language-"]) { background: #242424; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 13px; }
    .bubble-assistant pre code { font-size: 12px; }
    a.citation { color: #f90; font-family: monospace; font-size: 12px; text-decoration: none; border-bottom: 1px dashed #f90; white-space: nowrap; cursor: pointer; }
    a.citation:hover { color: #fc0; border-bottom-color: #fc0; }

    /* Diff output */
    #diff-output { display: none; }
    #diff-output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    #diff-output-label { font-size: 12px; color: #666; font-family: monospace; }
    #copy-btn { padding: 4px 14px; font-size: 12px; background: #2a2a2a; color: #aaa; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-weight: normal; }
    #copy-btn:hover { color: #ddd; border-color: #666; }
    #diff-pre { background: #161616; border: 1px solid #2a2a2a; border-radius: 4px; padding: 12px; overflow-x: auto; margin: 0; font-family: monospace; font-size: 12px; line-height: 1.55; white-space: pre; }
    .diff-add  { color: #5f5; }
    .diff-del  { color: #f55; }
    .diff-hunk { color: #5cf; }
    .diff-meta { color: #888; }

    /* File modal */
    #file-modal { display: none; position: fixed; inset: 0; z-index: 100; }
    #file-modal-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.75); }
    #file-modal-box { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: min(92vw, 980px); height: calc(100vh - 80px); background: #1a1a1a; border: 1px solid #444; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
    #file-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-bottom: 1px solid #2a2a2a; background: #222; flex-shrink: 0; }
    #file-modal-title { font-family: monospace; font-size: 13px; color: #f90; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #file-modal-close { background: none; border: none; color: #777; font-size: 22px; cursor: pointer; padding: 0 4px; line-height: 1; font-weight: normal; }
    #file-modal-close:hover { color: #ddd; }
    #file-modal-pre { flex: 1; overflow: auto; margin: 0; border-radius: 0; }
    #file-modal-pre code { display: block; font-size: 12px; line-height: 1.5; }

    /* Doom embed */
    #doom-embed { margin-bottom: 20px; border: 1px solid #333; border-radius: 6px; overflow: hidden; background: #000; }
    #doom-embed-label { font-size: 12px; color: #666; padding: 6px 12px; border-bottom: 1px solid #2a2a2a; background: #161616; }
    #doom-iframe { width: 100%; height: 400px; border: none; display: block; }
  </style>
</head>
<body>
  <h1>Legacy Lens</h1>
  <p class="subtitle">Ask questions about the original Doom (1993) C source code.</p>

  <div id="doom-embed">
    <div id="doom-embed-label">Play Doom (WebPrBoom)</div>
    <iframe id="doom-iframe" src="https://raz0red.github.io/webprboom" allow="fullscreen" title="Play Doom"></iframe>
  </div>

  <div class="controls">
    <span style="font-size:13px;color:#888">Task:</span>
    <div class="toggle-group">
      <label><input type="radio" name="task" value="ask" checked><span>Ask</span></label>
      <label><input type="radio" name="task" value="diff"><span>Suggest change</span></label>
    </div>
    <span style="font-size:13px;color:#888;margin-left:8px">Retrieval:</span>
    <div class="toggle-group">
      <label title="Fast retrieval: top-10 chunks, single query. Best for quick answers."><input type="radio" name="profile" value="interactive" checked><span>Interactive</span></label>
      <label title="Thorough retrieval: multi-query expansion, top-20 chunks, stronger rerank. Best for complex questions."><input type="radio" name="profile" value="deep"><span>Deep</span></label>
    </div>
    <span id="analysis-label" style="font-size:13px;color:#888;margin-left:8px">Analysis:</span>
    <select id="mode-select">
      ${MODE_OPTIONS_HTML}
    </select>
  </div>

  <form id="form">
    <p id="mode-description"></p>
    <textarea id="query" rows="3" placeholder=""></textarea>
    <div class="btn-row">
      <button type="submit" id="submit-btn">Ask</button>
      <button type="button" id="clear-btn">Clear</button>
    </div>
  </form>

  <div id="diff-output">
    <div id="diff-output-header">
      <span id="diff-output-label">Unified diff</span>
      <button id="copy-btn" type="button">Copy</button>
    </div>
    <pre id="diff-pre"></pre>
  </div>

  <div id="status"></div>

  <details id="chunks-panel" style="display:none">
    <summary>Retrieved chunks&nbsp;(<span id="chunks-count">0</span>)</summary>
    <div id="chunks-list"></div>
  </details>

  <div id="thread"></div>

  <!-- File modal -->
  <div id="file-modal">
    <div id="file-modal-backdrop"></div>
    <div id="file-modal-box">
      <div id="file-modal-header">
        <span id="file-modal-title"></span>
        <button id="file-modal-close" title="Close (Esc)">&times;</button>
      </div>
      <pre id="file-modal-pre"><code id="file-modal-code" class="language-c"></code></pre>
    </div>
  </div>

  <!-- Prism.js syntax highlighting (manual mode — we call highlight explicitly) -->
  <script>window.Prism = window.Prism || {}; Prism.manual = true;</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-c.min.js"></script>

  <script>
    const form         = document.getElementById('form');
    const queryEl      = document.getElementById('query');
    const submitBtn    = document.getElementById('submit-btn');
    const clearBtn     = document.getElementById('clear-btn');
    const statusEl     = document.getElementById('status');
    const threadEl     = document.getElementById('thread');
    const chunksPanel  = document.getElementById('chunks-panel');
    const chunksCount  = document.getElementById('chunks-count');
    const chunksList   = document.getElementById('chunks-list');
    const modeSelect       = document.getElementById('mode-select');
    const analysisLabel    = document.getElementById('analysis-label');
    const modeDescriptionEl = document.getElementById('mode-description');
    const MODE_DESCRIPTIONS = ${JSON.stringify(MODE_DESCRIPTIONS)};
    const MODE_PLACEHOLDERS = ${JSON.stringify(MODE_PLACEHOLDERS)};

    function updateModeDescription() {
      if (getTask() !== 'ask') return;
      const mode = modeSelect.value;
      modeDescriptionEl.textContent = MODE_DESCRIPTIONS[mode] || '';
      queryEl.placeholder = MODE_PLACEHOLDERS[mode] ? 'e.g. ' + MODE_PLACEHOLDERS[mode] : 'e.g. Where is the rendering loop?';
    }

    modeSelect.addEventListener('change', updateModeDescription);
    const diffOutput     = document.getElementById('diff-output');
    const diffOutputLabel = document.getElementById('diff-output-label');
    const diffPre        = document.getElementById('diff-pre');
    const copyBtn        = document.getElementById('copy-btn');
    const fileModal      = document.getElementById('file-modal');
    const fileModalTitle = document.getElementById('file-modal-title');
    const fileModalPre   = document.getElementById('file-modal-pre');
    const fileModalCode  = document.getElementById('file-modal-code');

    // Event delegation: citation clicks work for all bubbles (including multi-turn)
    threadEl.addEventListener('click', function(e) {
      const a = e.target.closest('a.citation');
      if (a) {
        e.preventDefault();
        openFileModal(a.dataset.path, parseInt(a.dataset.line || '0', 10));
      }
    });

    // Conversation history for multi-turn context (client-side only, session memory).
    let history = [];

    // ── Task toggle (Ask ↔ Suggest change) ────────────────────────────────────
    function getTask() {
      return document.querySelector('input[name=task]:checked').value;
    }

    document.querySelectorAll('input[name=task]').forEach((radio) => {
      radio.addEventListener('change', () => {
        const isDiff = getTask() === 'diff';
        modeSelect.style.display   = isDiff ? 'none' : '';
        analysisLabel.style.display = isDiff ? 'none' : '';
        modeDescriptionEl.style.display = isDiff ? 'none' : '';
        if (isDiff) {
          queryEl.placeholder = 'e.g. Add a comment above P_DamageMobj explaining the damage formula';
        } else {
          updateModeDescription();
        }
        submitBtn.textContent = isDiff ? 'Generate diff' : 'Ask';
        // Reset thread + history on task switch
        history = [];
        threadEl.innerHTML = '';
        diffOutput.style.display = 'none';
        diffOutputLabel.textContent = 'Unified diff';
        diffPre.innerHTML = '';
        statusEl.textContent = '';
        chunksPanel.style.display = 'none';
        chunksList.innerHTML = '';
        if (!isDiff) updateModeDescription();
      });
    });

    // Initial mode description
    updateModeDescription();

    // ── Clear ──────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', () => {
      history = [];
      threadEl.innerHTML = '';
      statusEl.textContent = '';
      queryEl.value = '';
      chunksPanel.style.display = 'none';
      chunksList.innerHTML = '';
      diffOutput.style.display = 'none';
      diffOutputLabel.textContent = 'Unified diff';
      diffPre.innerHTML = '';
    });

    // ── Ctrl/Cmd+Enter to submit ───────────────────────────────────────────────
    queryEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    // ── Diff submit handler ────────────────────────────────────────────────────
    async function submitDiff(query, profile) {
      submitBtn.disabled = true;
      const diffStartTime = Date.now();
      statusEl.textContent = 'Retrieving and generating diff\\u2026';
      diffOutput.style.display = 'none';
      diffPre.innerHTML = '';
      threadEl.innerHTML = '';
      chunksPanel.style.display = 'none';
      chunksList.innerHTML = '';

      try {
        const resp = await fetch('/api/diff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, profile }),
        });
        const data = await resp.json();
        if (data.error) {
          statusEl.textContent = 'Cannot generate diff: ' + data.error;
        } else {
          const elapsedMs = Date.now() - diffStartTime;
          const elapsedStr = elapsedMs >= 1000 ? (elapsedMs / 1000).toFixed(1) + 's' : elapsedMs + 'ms';
          statusEl.textContent = 'Done (' + elapsedStr + ')';
          diffOutputLabel.textContent = data.file_path ? 'Unified diff: ' + data.file_path : 'Unified diff';
          diffPre.innerHTML = renderDiff(data.diff);
          diffOutput.style.display = '';
        }
      } catch (err) {
        statusEl.textContent = 'Error: ' + (err.message || String(err));
      } finally {
        submitBtn.disabled = false;
      }
    }

    // ── Main submit handler ────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = queryEl.value.trim();
      if (!query) return;

      const profile = document.querySelector('input[name=profile]:checked').value;

      if (getTask() === 'diff') {
        await submitDiff(query, profile);
        return;
      }

      const mode    = modeSelect.value;

      submitBtn.disabled = true;
      const askStartTime = Date.now();
      statusEl.textContent = 'Retrieving chunks\\u2026';
      diffOutput.style.display = 'none';
      chunksPanel.style.display = 'none';
      chunksList.innerHTML = '';

      // Append user bubble and assistant bubble (order reversed by column-reverse: question above answer)
      const userBubble = document.createElement('div');
      userBubble.className = 'bubble bubble-user';
      userBubble.textContent = query;

      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'bubble bubble-assistant';
      threadEl.appendChild(assistantBubble);
      threadEl.appendChild(userBubble);
      assistantBubble.scrollIntoView({ block: 'start', behavior: 'auto' });

      // Clear query input so user can type follow-up immediately
      queryEl.value = '';

      let fullText = '';
      let lastChunks = [];
      let lastScrollTime = 0;
      let lastFormatTime = 0;
      let formatTimeoutId = null;
      const SCROLL_THROTTLE_MS = 100;
      const FORMAT_THROTTLE_MS = 80;
      function maybeScroll() {
        const now = Date.now();
        if (now - lastScrollTime >= SCROLL_THROTTLE_MS) {
          lastScrollTime = now;
          assistantBubble.scrollIntoView({ block: 'start', behavior: 'auto' });
        }
      }
      function flushFormatted() {
        if (formatTimeoutId != null) {
          clearTimeout(formatTimeoutId);
          formatTimeoutId = null;
        }
        assistantBubble.innerHTML = renderMarkdown(fullText, lastChunks);
        maybeScroll();
      }
      function scheduleFormattedUpdate() {
        if (formatTimeoutId != null) return;
        const now = Date.now();
        if (now - lastFormatTime >= FORMAT_THROTTLE_MS) {
          lastFormatTime = now;
          flushFormatted();
        } else {
          formatTimeoutId = setTimeout(() => {
            formatTimeoutId = null;
            lastFormatTime = Date.now();
            assistantBubble.innerHTML = renderMarkdown(fullText, lastChunks);
            maybeScroll();
          }, FORMAT_THROTTLE_MS - (now - lastFormatTime));
        }
      }

      try {
        const resp = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, profile, mode, history: history.slice(-6) }),
        });

        if (!resp.ok || !resp.body) throw new Error('Server returned ' + resp.status);

        const reader  = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\\n\\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            for (const line of part.split('\\n')) {
              if (!line.startsWith('data: ')) continue;
              let event;
              try { event = JSON.parse(line.slice(6)); } catch { continue; }

              if (event.type === 'retrieved') {
                statusEl.textContent = 'Retrieved ' + event.count + ' chunk' + (event.count === 1 ? '' : 's') + '. Generating answer\\u2026';
                lastChunks = event.chunks || [];
                renderChunksPanel(lastChunks, event.count);
              } else if (event.type === 'ttft') {
                const ttftStr = event.ms >= 1000 ? (event.ms / 1000).toFixed(1) + 's' : event.ms + 'ms';
                statusEl.textContent = 'First token in ' + ttftStr + ' \\u2026';
              } else if (event.type === 'token') {
                fullText += event.text;
                scheduleFormattedUpdate();
              } else if (event.type === 'done') {
                const elapsedMs = Date.now() - askStartTime;
                const elapsedStr = elapsedMs >= 1000 ? (elapsedMs / 1000).toFixed(1) + 's' : elapsedMs + 'ms';
                let statusText = 'Done \\u2014 ' + event.chunkCount + ' chunk' + (event.chunkCount === 1 ? '' : 's') + ' retrieved [' + profile + ', ' + mode + ']';
                if (event.ttftMs != null) {
                  const ttftStr = event.ttftMs >= 1000 ? (event.ttftMs / 1000).toFixed(1) + 's' : event.ttftMs + 'ms';
                  statusText += ' (TTFT: ' + ttftStr + ', total: ' + elapsedStr + ')';
                } else {
                  statusText += ' (' + elapsedStr + ')';
                }
                statusEl.textContent = statusText;
                flushFormatted();
                // Defer Prism so DOM is fully updated; use highlightAllUnder for container
                requestAnimationFrame(() => {
                  if (typeof Prism !== 'undefined') {
                    if (Prism.highlightAllUnder) {
                      Prism.highlightAllUnder(assistantBubble);
                    } else {
                      assistantBubble.querySelectorAll('pre code[class*="language-"]').forEach((el) => {
                        if (Prism.highlightElement) Prism.highlightElement(el);
                      });
                    }
                  }
                });
                // Citation clicks handled by delegation on threadEl
                // Append this turn to history for subsequent requests
                history.push({ role: 'user', content: query });
                history.push({ role: 'assistant', content: fullText });
                assistantBubble.scrollIntoView({ block: 'start', behavior: 'auto' });
              } else if (event.type === 'error') {
                statusEl.textContent = 'Error: ' + event.message;
                assistantBubble.remove();
                userBubble.remove();
              }
            }
          }
        }
      } catch (err) {
        statusEl.textContent = 'Error: ' + (err.message || String(err));
        assistantBubble.remove();
        userBubble.remove();
      } finally {
        submitBtn.disabled = false;
      }
    });

    // ── Chunks panel ──────────────────────────────────────────────────────────
    function renderChunksPanel(chunks, count) {
      if (!chunks || !chunks.length) return;
      chunksCount.textContent = count;
      chunksList.innerHTML = '';
      for (const c of chunks) {
        const row = document.createElement('div');
        row.className = 'chunk-row';
        row.innerHTML =
          '<span class="chunk-name">' + escHtml(c.symbol_name) + '</span>' +
          '<span class="chunk-loc">' + escHtml(c.file_path) + ':' + c.start_line + '\u2013' + c.end_line + '</span>' +
          '<span class="chunk-score">' + (c.score ?? 0).toFixed(4) + '</span>';
        chunksList.appendChild(row);
      }
      chunksPanel.style.display = '';
    }

    // ── File modal ─────────────────────────────────────────────────────────────
    async function openFileModal(filePath, startLine) {
      if (!filePath) return;
      fileModalTitle.textContent = filePath + (startLine ? ':' + startLine : '');
      fileModalCode.textContent = 'Loading\\u2026';
      fileModalCode.className = 'language-c';
      fileModal.style.display = 'block';

      var ghUrl = 'https://github.com/id-Software/DOOM/blob/master/' + filePath + (startLine ? '#L' + startLine : '');

      try {
        const resp = await fetch('/api/file?path=' + encodeURIComponent(filePath));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const text = await resp.text();
        fileModalCode.textContent = text;
        if (typeof Prism !== 'undefined' && Prism.highlightElement) Prism.highlightElement(fileModalCode);
      } catch (err) {
        fileModalCode.innerHTML = 'File not available. <a href="' + escHtml(ghUrl) + '" target="_blank" rel="noopener">View on GitHub</a>';
        return;
      }

      // Scroll to cited line after content is set (12px font × 1.5 line-height ≈ 18px/line)
      if (startLine > 1) {
        fileModalPre.scrollTop = Math.max(0, (startLine - 8) * 18);
      }
    }

    function closeFileModal() {
      fileModal.style.display = 'none';
    }

    document.getElementById('file-modal-close').addEventListener('click', closeFileModal);
    document.getElementById('file-modal-backdrop').addEventListener('click', closeFileModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeFileModal();
    });

    // ── HTML escaping ─────────────────────────────────────────────────────────
    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Path resolution for GitHub links ────────────────────────────────────────
    // LLM may cite shortened paths (e.g. d_main.c); resolve to full path from chunks.
    function resolveFilePath(filePath, chunks) {
      if (!filePath || filePath.indexOf('/') >= 0) return filePath;
      if (!chunks || !chunks.length) return filePath;
      const found = chunks.find(function(c) {
        return c.file_path === filePath || c.file_path.endsWith('/' + filePath);
      });
      return found ? found.file_path : filePath;
    }

    // ── Inline markdown renderer ───────────────────────────────────────────────
    // Citations: \`path/file.c:start-end\`  →  link that opens file modal
    function renderInline(text, chunks) {
      let s = escHtml(text);

      s = s.replace(
        /\`([\\w.\\/\\-]+\\.(?:c|h):\\d+(?:-\\d+)?)\`/g,
        function(_, citation) {
          var colonIdx = citation.lastIndexOf(':');
          var filePath = citation.slice(0, colonIdx);
          var startLine = citation.slice(colonIdx + 1).split('-')[0];
          var resolved = resolveFilePath(filePath, chunks);
          var ghUrl = 'https://github.com/id-Software/DOOM/blob/master/' + resolved + '#L' + startLine;
          return '<a href="' + ghUrl + '" class="citation" data-path="' + resolved + '" data-line="' + startLine + '">' + citation + '</a>';
        }
      );

      // Remaining inline code
      s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      // Bold
      s = s.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      // Italic
      s = s.replace(/(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
      return s;
    }

    // ── Copy diff to clipboard ────────────────────────────────────────────────
    copyBtn.addEventListener('click', () => {
      const text = diffPre.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }).catch(() => {
        copyBtn.textContent = 'Failed';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });

    // ── Diff renderer ─────────────────────────────────────────────────────────
    function renderDiff(text) {
      return text.split('\\n').map((line) => {
        let cls = '';
        if (line.startsWith('+++') || line.startsWith('---')) cls = 'diff-meta';
        else if (line.startsWith('@@'))  cls = 'diff-hunk';
        else if (line.startsWith('+'))   cls = 'diff-add';
        else if (line.startsWith('-'))   cls = 'diff-del';
        // else: context line (starts with space) or empty — no class
        const escaped = escHtml(line);
        return cls ? '<span class="' + cls + '">' + escaped + '</span>' : escaped;
      }).join('\\n');
    }

    // ── Block markdown renderer ───────────────────────────────────────────────
    function renderMarkdown(text, chunks) {
      chunks = chunks || [];
      const lines = text.split('\\n');
      let html = '';
      let inList = false;
      let inCode = false;
      let codeLang = 'c';
      let codeLines = [];

      const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

      for (const raw of lines) {
        // Inside a fenced code block — collect lines until closing fence
        if (inCode) {
          if (raw.trimEnd() === '\`\`\`') {
            html += '<pre><code class="language-' + escHtml(codeLang) + '">' + escHtml(codeLines.join('\\n')) + '</code></pre>';
            inCode = false;
            codeLines = [];
          } else {
            codeLines.push(raw);
          }
          continue;
        }

        const line = raw.trimEnd();

        // Fenced code block start: \`\`\`c or \`\`\` (strip leading junk/stray chars from LLM)
        const fence = line.replace(/^[^\`]*/, '').match(/^\`\`\`(\w*)/);
        if (fence) {
          closeList();
          inCode = true;
          codeLang = fence[1] || 'c';
          codeLines = [];
          continue;
        }

        // Heading
        const hm = line.match(/^(#{1,3})\\s+(.*)/);
        if (hm) {
          closeList();
          const lvl = hm[1].length;
          html += '<h' + lvl + '>' + renderInline(hm[2], chunks) + '</h' + lvl + '>';
          continue;
        }

        // List item
        const lm = line.match(/^(?:\\d+\\.|-|\\*)\\s+(.*)/);
        if (lm) {
          if (!inList) { html += '<ul>'; inList = true; }
          html += '<li>' + renderInline(lm[1], chunks) + '</li>';
          continue;
        }

        closeList();

        if (line.trim() === '') {
          html += '<br>';
          continue;
        }

        html += '<p>' + renderInline(line.trim(), chunks) + '</p>';
      }

      // Close any unclosed fenced block
      if (inCode) {
        html += '<pre><code class="language-' + escHtml(codeLang) + '">' + escHtml(codeLines.join('\\n')) + '</code></pre>';
      }

      closeList();
      return html;
    }
  </script>
</body>
</html>`;
