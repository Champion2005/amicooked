import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 10;

/**
 * TagInput – pill-based tag input with typeahead suggestions.
 *
 * Props:
 *  tags          – string[]  current tags
 *  onChange      – (tags: string[]) => void
 *  suggestions   – string[]  predefined suggestion list
 *  placeholder   – string
 *  disabled      – boolean
 *  maxTags       – number (default 10)
 *  maxTagLength  – number (default 30)
 *  id            – string
 */
export default function TagInput({
  tags = [],
  onChange,
  suggestions = [],
  placeholder = 'Type and press Enter…',
  disabled = false,
  maxTags = MAX_TAGS,
  maxTagLength = MAX_TAG_LENGTH,
  id,
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Filtered suggestions: match input, exclude already-added tags
  const filtered = input.trim().length > 0
    ? suggestions.filter(
        s =>
          s.toLowerCase().includes(input.trim().toLowerCase()) &&
          !tags.some(t => t.toLowerCase() === s.toLowerCase())
      ).slice(0, 6)
    : [];

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTag = (value) => {
    const trimmed = value.trim().slice(0, maxTagLength);
    if (!trimmed) return;
    if (tags.length >= maxTags) return;
    if (tags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...tags, trimmed]);
    setInput('');
    setHighlightIdx(-1);
    setShowSuggestions(false);
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        addTag(filtered[highlightIdx]);
      } else {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIdx(-1);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    // If they typed a comma, treat everything before it as a tag
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((part, i) => {
        if (i < parts.length - 1) addTag(part);
      });
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val.slice(0, maxTagLength));
    }
    setShowSuggestions(true);
    setHighlightIdx(-1);
  };

  const atLimit = tags.length >= maxTags;

  return (
    <div ref={containerRef} className="relative">
      {/* Tag pills + input area */}
      <div
        className={`flex flex-wrap gap-1.5 items-center min-h-[44px] w-full px-3 py-2 rounded-md bg-background border border-border text-foreground focus-within:ring-2 focus-within:ring-ring transition-shadow ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface border border-border text-foreground select-none"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(idx);
                }}
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-border/60 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        ))}

        {!atLimit && (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder-gray-500"
            autoComplete="off"
          />
        )}
        {atLimit && tags.length > 0 && (
          <span className="text-xs text-muted-foreground ml-1">Max {maxTags} tags</span>
        )}
      </div>

      {/* Counter */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {input.length > 0 && `${input.length}/${maxTagLength}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {tags.length}/{maxTags} tags
        </span>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filtered.length > 0 && !disabled && !atLimit && (
        <ul className="absolute z-20 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-44 overflow-y-auto">
          {filtered.map((s, idx) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                idx === highlightIdx
                  ? 'bg-surface text-foreground'
                  : 'text-muted-foreground hover:bg-surface/50'
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
