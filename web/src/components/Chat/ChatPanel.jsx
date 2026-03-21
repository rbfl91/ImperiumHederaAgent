import { useRef, useEffect } from 'react';
import { useRfq } from '../../context/RfqContext';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import ChatInput from './ChatInput';


export default function ChatPanel({ onSend }) {
  const { state } = useRfq();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.isTyping, state.isStreaming]);

  // Find the index of the last agent message
  let lastAgentIdx = -1;
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === 'agent') { lastAgentIdx = i; break; }
  }

  // Chips: only from latest agent message (LLM-generated only, no fallback)
  const lastAgentMsg = lastAgentIdx >= 0 ? state.messages[lastAgentIdx] : null;
  const latestChips = lastAgentMsg?.structured?.chips;
  const activeChips = (lastAgentMsg && !state.isTyping && !state.isStreaming && !state.sessionEnded && latestChips && latestChips.length > 0)
    ? latestChips
    : null;

  // Only show QuotesTable on the FIRST agent message that contains quotes
  let firstQuotesIdx = -1;
  for (let i = 0; i < state.messages.length; i++) {
    if (state.messages[i].role === 'agent' && state.messages[i].structured?.quotes?.length > 0) {
      firstQuotesIdx = i;
      break;
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {state.messages.map((msg, i) => (
          <div key={i}>
            <MessageBubble
              message={msg}
              isLatestAgent={i === lastAgentIdx}
              animate={i === lastAgentIdx}
              onSend={(state.isTyping || state.isStreaming) ? null : onSend}
              showQuotes={i === firstQuotesIdx}
              quotesSelectable={state.currentStage === 'investment_summary'}
            />
            {/* Show chips directly under the last agent message */}
            {i === lastAgentIdx && activeChips && !state.isTyping && (
              <div className="chat-chips-inline">
                <SuggestionChips chips={activeChips} onSelect={onSend} />
              </div>
            )}
          </div>
        ))}

        {state.isTyping && (
          <div className="message message--agent">
            <div className="message-avatar">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="14" fill="#0f101d" />
                <path d="M9 14l2 2 6-6" stroke="white" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div className="message-content">
              <div className="message-sender">ANNUITY ASSISTANT</div>
              <div className="message-bubble message-bubble--agent">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={onSend} disabled={state.isTyping || state.isStreaming || state.sessionEnded} />
    </div>
  );
}
