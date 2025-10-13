self.onmessage = function(e) {
  const { markdown } = e.data;
  
  if (!markdown) {
    self.postMessage({ html: '' });
    return;
  }

  let html = markdown
    .split('\n')
    .map(line => {
      // Headers
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      
      // List items
      if (line.match(/^[*-]\s+/)) {
        return `<li>${line.slice(2)}</li>`;
      }
      
      // Empty lines
      if (!line.trim()) return '<br>';
      
      return line;
    })
    .join('\n')
    // Inline formatting
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="summary-link">$1</a>')
    // Wrap lists
    .replace(/(<li>.*?<\/li>\n?)+/gs, match => `<ul>${match}</ul>`)
    // Wrap paragraphs
    .replace(/^(?!<[hul]|<br>)(.+)$/gm, '<p>$1</p>')
    // Clean up
    .replace(/<br>\n?/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\n+/g, '\n');
  
  self.postMessage({ html });
};
