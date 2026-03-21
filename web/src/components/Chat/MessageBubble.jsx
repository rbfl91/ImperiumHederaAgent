import { useState, useEffect, useRef } from 'react';
import QuotesTable from './QuotesTable';
import InvestmentCard from './InvestmentCard';

/**
 * Minimal markdown: **bold** and line breaks.
 */
function renderMarkdown(text) {
  return text.split('\n').map((line, i) => {
    const parts = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const idx = boldMatch.index;
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(idx + boldMatch[0].length);
        continue;
      }
      parts.push(remaining);
      break;
    }

    return <p key={i}>{parts.length > 0 ? parts : line}</p>;
  });
}

const CHARS_PER_TICK = 3; // characters revealed per frame
const TICK_MS = 16; // ~60fps

/**
 * Typewriter hook — progressively reveals text for the latest agent message.
 */
function useTypewriter(text, shouldAnimate) {
  const [displayedLen, setDisplayedLen] = useState(shouldAnimate ? 0 : text.length);
  const [done, setDone] = useState(!shouldAnimate);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedLen(text.length);
      setDone(true);
      return;
    }

    setDisplayedLen(0);
    setDone(false);

    let pos = 0;
    const step = () => {
      pos = Math.min(pos + CHARS_PER_TICK, text.length);
      setDisplayedLen(pos);
      if (pos < text.length) {
        rafRef.current = setTimeout(step, TICK_MS);
      } else {
        setDone(true);
      }
    };

    rafRef.current = setTimeout(step, TICK_MS);
    return () => clearTimeout(rafRef.current);
  }, [text, shouldAnimate]);

  return { displayedText: text.slice(0, displayedLen), done };
}

export default function MessageBubble({ message, isLatestAgent, onSend, animate, showQuotes, quotesSelectable }) {
  const isAgent = message.role === 'agent';
  const structured = message.structured || {};

  // Skip typewriter for streamed messages (streaming IS the animation)
  const shouldAnimate = isAgent && animate && !message.streamed && !message.streaming;
  const { displayedText, done } = useTypewriter(message.text, shouldAnimate);

  // During streaming, hide ~~~rfq-*~~~ or ```rfq-*``` blocks from display
  const visibleText = message.streaming
    ? message.text.replace(/(?:~~~|```)rfq-[\s\S]*$/, '').trimEnd()
    : displayedText;

  return (
    <div className={`message message--${message.role}`}>
      {isAgent && (
        <div className="message-avatar">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#0f101d" />
            <path d="M9 14l2 2 6-6" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>
      )}

      <div className="message-content">
        {isAgent && <div className="message-sender">ANNUITY ASSISTANT</div>}
        {message.role === 'user' && <div className="message-sender message-sender--user">YOU</div>}

        <div className={`message-bubble message-bubble--${message.role}`}>
          {renderMarkdown(visibleText)}
          {message.streaming && <span className="typewriter-cursor">|</span>}
          {shouldAnimate && !done && <span className="typewriter-cursor">|</span>}
        </div>

        {/* Show structured content after streaming/typewriter finishes */}
        {!message.streaming && (!shouldAnimate || done) && showQuotes && structured.quotes && (
          <QuotesTable
            quotes={structured.quotes}
            onSelect={isLatestAgent && quotesSelectable ? onSend : null}
          />
        )}

        {!message.streaming && (!shouldAnimate || done) && structured.investment_card && (
          <InvestmentCard data={structured.investment_card} />
        )}
      </div>
    </div>
  );
}
