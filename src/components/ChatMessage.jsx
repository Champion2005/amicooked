import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * Shared chat message component used by both ChatPopup and SavedProjectsOverlay.
 *
 * Design:
 * - User messages: right-aligned green bubble
 * - AI messages: left-aligned, no bubble — clean flowing markdown text
 */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface hover:bg-border text-muted-foreground hover:text-gray-200 transition-colors opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const markdownComponents = {
  // ---------- Code (inline + block) ----------
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    // Block-level code (fenced) — only if multi-line
    if (!inline && codeString.includes('\n')) {
      return (
        <div className="group/code relative my-3 max-w-full overflow-hidden">
          {match && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-surface border border-border border-b-0 rounded-t-lg">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{match[1]}</span>
            </div>
          )}
          <div className={`relative ${match ? '' : 'rounded-t-lg'}`}>
            <CopyButton text={codeString} />
            <pre className={`bg-background border border-border ${match ? 'rounded-b-lg' : 'rounded-lg'} p-4 overflow-x-auto`}>
              <code className="text-sm leading-relaxed font-mono text-foreground break-normal whitespace-pre" {...props}>
                {children}
              </code>
            </pre>
          </div>
        </div>
      );
    }

    // Inline code (or single-line code blocks)
    return (
      <code
        className="bg-surface border border-border px-1.5 py-0.5 rounded text-sm text-code-inline font-mono break-all"
        {...props}
      >
        {children}
      </code>
    );
  },

  // ---------- Pre (wrapper — constrain width) ----------
  pre: ({ children }) => <div className="max-w-full overflow-x-auto min-w-0">{children}</div>,

  // ---------- Links ----------
  a: ({ node, children, ...props }) => (
    <a
      className="text-accent hover:underline break-all"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  // ---------- Lists ----------
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc pl-6 space-y-1.5 my-2" {...props}>
      {children}
    </ul>
  ),
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal pl-6 space-y-1.5 my-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, ...props }) => (
    <li className="text-gray-300 leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // ---------- Headings ----------
  h1: ({ node, children, ...props }) => (
    <h1 className="text-lg font-bold text-foreground mt-5 mb-2 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className="text-base font-bold text-foreground mt-4 mb-2 first:mt-0" {...props}>{children}</h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0" {...props}>{children}</h3>
  ),

  // ---------- Paragraphs ----------
  p: ({ node, children, ...props }) => (
    <p className="text-gray-300 leading-relaxed mb-3 last:mb-0" {...props}>{children}</p>
  ),

  // ---------- Blockquotes ----------
  blockquote: ({ node, children, ...props }) => (
    <blockquote
      className="border-l-3 border-accent/40 pl-4 my-3 text-muted-foreground italic"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // ---------- Horizontal Rule ----------
  hr: () => <hr className="border-border my-4" />,

  // ---------- Tables ----------
  table: ({ node, children, ...props }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-border">
      <table className="min-w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node, children, ...props }) => (
    <thead className="bg-card" {...props}>{children}</thead>
  ),
  th: ({ node, children, ...props }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 border-b border-border" {...props}>
      {children}
    </th>
  ),
  td: ({ node, children, ...props }) => (
    <td className="px-3 py-2 text-muted-foreground border-b border-border" {...props}>
      {children}
    </td>
  ),

  // ---------- Strong / Em ----------
  strong: ({ node, children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>{children}</strong>
  ),
  em: ({ node, children, ...props }) => (
    <em className="italic text-gray-300" {...props}>{children}</em>
  ),
};

/**
 * @param {Object} props
 * @param {'user'|'assistant'} props.role
 * @param {string} props.content
 * @param {string} [props.timestamp]
 * @param {Function} [props.formatTime] - Optional formatter for the timestamp
 */
export default function ChatMessage({ role, content, timestamp, formatTime }) {
  const timeLabel =
    timestamp && formatTime ? formatTime(timestamp) : timestamp || '';

  if (role === 'user') {
    return (
      <div className="max-w-4xl w-full mx-auto">
        <div className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-xl rounded-2xl rounded-br-sm px-3 sm:px-4 py-2.5 bg-primary text-foreground min-w-0">
            <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{content}</p>
            {timeLabel && (
              <p className="text-[10px] mt-1.5 text-foreground/40 text-right">{timeLabel}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message — no bubble, just clean markdown
  return (
    <div className="max-w-full sm:max-w-4xl w-full mx-auto min-w-0 overflow-hidden">
      <div className="px-1 sm:px-2 min-w-0" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
        <div className="chat-markdown text-[15px] min-w-0 w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {content}
          </ReactMarkdown>
        </div>
        {timeLabel && (
          <p className="text-[10px] mt-1 text-muted-foreground">{timeLabel}</p>
        )}
      </div>
    </div>
  );
}
