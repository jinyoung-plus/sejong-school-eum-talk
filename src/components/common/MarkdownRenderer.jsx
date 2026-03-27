// src/components/common/MarkdownRenderer.jsx
// Chat.jsx에서 사용하던 마크다운 렌더러를 공용 컴포넌트로 분리

function parseInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(...parseBoldCode(remaining.slice(0, linkMatch.index), key));
        key += 10;
      }
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
           className="text-blue-600 underline hover:text-blue-800">
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
      continue;
    }
    parts.push(...parseBoldCode(remaining, key));
    break;
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts;
}

function parseBoldCode(text, baseKey) {
  const result = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) result.push(text.slice(lastIdx, match.index));
    if (match[2]) {
      result.push(<strong key={baseKey++} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3]) {
      result.push(<code key={baseKey++} className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono text-blue-700">{match[3]}</code>);
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) result.push(text.slice(lastIdx));
  return result;
}

export default function MarkdownRenderer({ text }) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-bold mt-3 mb-1 text-gray-800">{parseInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-900">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">{parseInline(line.slice(2))}</h1>);
    }
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-gray-200" />);
    }
    else if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const dataLines = tableLines.filter(l => !l.match(/^\|[\s\-|]+\|$/));
      if (dataLines.length > 0) {
        const headers = dataLines[0].split('|').filter(c => c.trim() !== '');
        const rows = dataLines.slice(1);
        elements.push(
          <div key={`tbl-${i}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                      {parseInline(h.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const cells = row.split('|').filter(c => c.trim() !== '');
                  return (
                    <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                      {cells.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 border-b border-gray-100">
                          {parseInline(cell.trim())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="flex gap-1.5 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            <span>{parseInline(lines[i].slice(2))}</span>
          </li>
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1 my-2">{listItems}</ul>);
      continue;
    }
    else if (line.match(/^\d+\. /)) {
      const listItems = [];
      let num = 1;
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(
          <li key={i} className="flex gap-2 items-start">
            <span className="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">{num}</span>
            <span>{parseInline(lines[i].replace(/^\d+\. /, ''))}</span>
          </li>
        );
        i++;
        num++;
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-1.5 my-2">{listItems}</ol>);
      continue;
    }
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    else {
      elements.push(<p key={i} className="leading-relaxed">{parseInline(line)}</p>);
    }

    i++;
  }

  return <div className="text-sm text-gray-800 space-y-0.5">{elements}</div>;
}
