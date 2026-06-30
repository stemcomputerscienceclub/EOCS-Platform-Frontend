import katex from 'katex';

function renderMath(text) {
  if (!text) return '';

  let result = text;

  // Display math $$...$$
  result = result.replace(/\$\$(.*?)\$\$/gs, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="katex-error">${expr}</span>`;
    }
  });

  // Inline math $...$
  result = result.replace(/\$(.*?)\$/g, (_, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="katex-error">${expr}</span>`;
    }
  });

  return result;
}

export default function LatexRenderer({ html, as = 'span', className }) {
  const rendered = renderMath(html || '');
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: rendered }} />;
}
