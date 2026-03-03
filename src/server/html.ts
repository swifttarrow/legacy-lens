export const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Legacy Lens</title>
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
    #output { background: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: 16px; min-height: 60px; line-height: 1.65; font-size: 14px; }
    #output:empty { display: none; }
    #output pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; }
    #output p { margin: 0 0 10px; }
    #output p:last-child { margin-bottom: 0; }
    #output ul, #output ol { margin: 4px 0 10px; padding-left: 22px; }
    #output li { margin-bottom: 5px; }
    #output h1, #output h2, #output h3 { color: #f90; margin: 12px 0 6px; }
    #output code { background: #242424; padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 13px; }
    a.citation { color: #f90; font-family: monospace; font-size: 12px; text-decoration: none; border-bottom: 1px dashed #f90; white-space: nowrap; }
    a.citation:hover { color: #fc0; border-bottom-color: #fc0; }
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
  <div id="output"></div>

  <script>
    const form       = document.getElementById('form');
    const queryEl    = document.getElementById('query');
    const submitBtn  = document.getElementById('submit-btn');
    const clearBtn   = document.getElementById('clear-btn');
    const statusEl   = document.getElementById('status');
    const outputEl   = document.getElementById('output');

    clearBtn.addEventListener('click', () => {
      outputEl.innerHTML = '';
      statusEl.textContent = '';
      queryEl.value = '';
    });

    // Allow Ctrl+Enter / Cmd+Enter to submit
    queryEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = queryEl.value.trim();
      if (!query) return;

      const profile = document.querySelector('input[name=profile]:checked').value;

      submitBtn.disabled = true;
      statusEl.textContent = 'Retrieving chunks\u2026';
      outputEl.innerHTML = '<pre id="stream-pre"></pre>';
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
                statusEl.textContent = 'Retrieved ' + event.count + ' chunk' + (event.count === 1 ? '' : 's') + '. Generating answer\u2026';
              } else if (event.type === 'token') {
                fullText += event.text;
                pre.textContent = fullText;
              } else if (event.type === 'done') {
                statusEl.textContent = 'Done \u2014 ' + event.chunkCount + ' chunk' + (event.chunkCount === 1 ? '' : 's') + ' retrieved [' + profile + ']';
                outputEl.innerHTML = renderMarkdown(fullText);
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

    // ── Markdown renderer ────────────────────────────────────────────────────

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * Render inline markdown: citations → GitHub links, code spans, bold, italic.
     * Citations look like: \`linuxdoom-1.10/p_inter.c:774-917\`
     */
    function renderInline(text) {
      let s = escHtml(text);

      // Citations: \`path/file.c:start-end\` or \`path/file.c:start\`
      s = s.replace(
        /\`([\w.\\/\\-]+\\.(?:c|h):\\d+(?:-\\d+)?)\`/g,
        function(_, citation) {
          var colonIdx = citation.lastIndexOf(':');
          var filePath = citation.slice(0, colonIdx);
          var startLine = citation.slice(colonIdx + 1).split('-')[0];
          var url = 'https://github.com/id-Software/DOOM/blob/master/' + filePath + '#L' + startLine;
          return '<a href="' + url + '" target="_blank" class="citation">' + citation + '</a>';
        }
      );

      // Remaining code spans
      s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
      // Bold
      s = s.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
      // Italic (not preceded/followed by *)
      s = s.replace(/(?<!\\*)\\*(?!\\*)(.+?)(?<!\\*)\\*(?!\\*)/g, '<em>$1</em>');
      return s;
    }

    function renderMarkdown(text) {
      const lines = text.split('\\n');
      let html = '';
      let inList = false;

      const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

      for (const raw of lines) {
        const line = raw.trimEnd();

        // Heading
        const hm = line.match(/^(#{1,3})\\s+(.*)/);
        if (hm) {
          closeList();
          const lvl = hm[1].length;
          html += '<h' + lvl + '>' + renderInline(hm[2]) + '</h' + lvl + '>';
          continue;
        }

        // Numbered or bullet list item
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

      closeList();
      return html;
    }
  </script>
</body>
</html>`;
