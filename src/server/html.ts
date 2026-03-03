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
    .btn-row { display: flex; gap: 8px; margin-top: 8px; }
    button { padding: 8px 20px; font-size: 14px; border-radius: 4px; cursor: pointer; border: none; font-weight: bold; }
    #submit-btn { background: #f60; color: #000; }
    #submit-btn:disabled { background: #555; color: #888; cursor: not-allowed; }
    #clear-btn { background: #2a2a2a; color: #aaa; border: 1px solid #444; }
    #status { color: #777; font-size: 13px; margin: 10px 0 6px; min-height: 18px; }

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

    /* Answer output */
    #output { background: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: 16px; min-height: 60px; line-height: 1.65; font-size: 14px; }
    #output:empty { display: none; }
    #output pre { margin: 8px 0; border-radius: 4px; overflow-x: auto; }
    #output p { margin: 0 0 10px; }
    #output p:last-child { margin-bottom: 0; }
    #output ul, #output ol { margin: 4px 0 10px; padding-left: 22px; }
    #output li { margin-bottom: 5px; }
    #output h1, #output h2, #output h3 { color: #f90; margin: 12px 0 6px; }
    #output code:not([class*="language-"]) { background: #242424; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 13px; }
    #output pre code { font-size: 12px; }
    a.citation { color: #f90; font-family: monospace; font-size: 12px; text-decoration: none; border-bottom: 1px dashed #f90; white-space: nowrap; cursor: pointer; }
    a.citation:hover { color: #fc0; border-bottom-color: #fc0; }

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
  </style>
</head>
<body>
  <h1>Legacy Lens</h1>
  <p class="subtitle">Ask questions about the original Doom (1993) C source code.</p>

  <div class="controls">
    <span style="font-size:13px;color:#888">Mode:</span>
    <div class="toggle-group">
      <label><input type="radio" name="profile" value="interactive" checked><span>Interactive</span></label>
      <label><input type="radio" name="profile" value="deep"><span>Deep</span></label>
    </div>
  </div>

  <form id="form">
    <textarea id="query" rows="3" placeholder="e.g. Where is the rendering loop? How does the player move?"></textarea>
    <div class="btn-row">
      <button type="submit" id="submit-btn">Ask</button>
      <button type="button" id="clear-btn">Clear</button>
    </div>
  </form>

  <div id="status"></div>

  <details id="chunks-panel" style="display:none">
    <summary>Retrieved chunks&nbsp;(<span id="chunks-count">0</span>)</summary>
    <div id="chunks-list"></div>
  </details>

  <div id="output"></div>

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
    const outputEl     = document.getElementById('output');
    const chunksPanel  = document.getElementById('chunks-panel');
    const chunksCount  = document.getElementById('chunks-count');
    const chunksList   = document.getElementById('chunks-list');
    const fileModal      = document.getElementById('file-modal');
    const fileModalTitle = document.getElementById('file-modal-title');
    const fileModalPre   = document.getElementById('file-modal-pre');
    const fileModalCode  = document.getElementById('file-modal-code');

    // ── Clear ──────────────────────────────────────────────────────────────────
    clearBtn.addEventListener('click', () => {
      outputEl.innerHTML = '';
      statusEl.textContent = '';
      queryEl.value = '';
      chunksPanel.style.display = 'none';
      chunksList.innerHTML = '';
    });

    // ── Ctrl/Cmd+Enter to submit ───────────────────────────────────────────────
    queryEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    // ── Main submit handler ────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = queryEl.value.trim();
      if (!query) return;

      const profile = document.querySelector('input[name=profile]:checked').value;

      submitBtn.disabled = true;
      statusEl.textContent = 'Retrieving chunks\\u2026';
      outputEl.innerHTML = '<pre id="stream-pre" style="white-space:pre-wrap;word-break:break-word;margin:0;font-family:inherit"></pre>';
      chunksPanel.style.display = 'none';
      chunksList.innerHTML = '';
      const pre = document.getElementById('stream-pre');
      let fullText = '';

      try {
        const resp = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, profile }),
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
                renderChunksPanel(event.chunks || [], event.count);
              } else if (event.type === 'token') {
                fullText += event.text;
                pre.textContent = fullText;
              } else if (event.type === 'done') {
                statusEl.textContent = 'Done \\u2014 ' + event.chunkCount + ' chunk' + (event.chunkCount === 1 ? '' : 's') + ' retrieved [' + profile + ']';
                outputEl.innerHTML = renderMarkdown(fullText);
                if (typeof Prism !== 'undefined' && Prism.highlightElement) {
                  outputEl.querySelectorAll('pre code[class*="language-"]').forEach((el) => {
                    Prism.highlightElement(el);
                  });
                }
                // Attach click handlers directly to each citation (no delegation needed)
                outputEl.querySelectorAll('a.citation').forEach(function(a) {
                  a.addEventListener('click', function(e) {
                    e.preventDefault();
                    openFileModal(a.dataset.path, parseInt(a.dataset.line || '0', 10));
                  });
                });
              } else if (event.type === 'error') {
                statusEl.textContent = 'Error: ' + event.message;
                outputEl.innerHTML = '';
              }
            }
          }
        }
      } catch (err) {
        statusEl.textContent = 'Error: ' + (err.message || String(err));
        outputEl.innerHTML = '';
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

      try {
        const resp = await fetch('/api/file?path=' + encodeURIComponent(filePath));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const text = await resp.text();
        fileModalCode.textContent = text;
        if (typeof Prism !== 'undefined' && Prism.highlightElement) Prism.highlightElement(fileModalCode);
      } catch (err) {
        fileModalCode.textContent = 'Error loading file: ' + (err.message || String(err));
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

    // ── Inline markdown renderer ───────────────────────────────────────────────
    // Citations: \`path/file.c:start-end\`  →  link that opens file modal
    function renderInline(text) {
      let s = escHtml(text);

      s = s.replace(
        /\`([\\w.\\/\\-]+\\.(?:c|h):\\d+(?:-\\d+)?)\`/g,
        function(_, citation) {
          var colonIdx = citation.lastIndexOf(':');
          var filePath = citation.slice(0, colonIdx);
          var startLine = citation.slice(colonIdx + 1).split('-')[0];
          var ghUrl = 'https://github.com/id-Software/DOOM/blob/master/' + filePath + '#L' + startLine;
          return '<a href="' + ghUrl + '" class="citation" data-path="' + filePath + '" data-line="' + startLine + '">' + citation + '</a>';
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

    // ── Block markdown renderer ───────────────────────────────────────────────
    function renderMarkdown(text) {
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

        // Fenced code block start: \`\`\`c or \`\`\`
        const fence = line.match(/^\`\`\`(\w*)/);
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
          html += '<h' + lvl + '>' + renderInline(hm[2]) + '</h' + lvl + '>';
          continue;
        }

        // List item
        const lm = line.match(/^(?:\\d+\\.|-|\\*)\\s+(.*)/);
        if (lm) {
          if (!inList) { html += '<ul>'; inList = true; }
          html += '<li>' + renderInline(lm[1]) + '</li>';
          continue;
        }

        closeList();

        if (line.trim() === '') {
          html += '<br>';
          continue;
        }

        html += '<p>' + renderInline(line.trim()) + '</p>';
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
