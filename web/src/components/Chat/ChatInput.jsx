import { useState } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your response here..."
        disabled={disabled}
        autoFocus
      />
      <button type="submit" disabled={disabled || !text.trim()} className="chat-send-btn">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 10l14-7-7 14-2-5-5-2z" fill="currentColor" />
        </svg>
      </button>
    </form>
  );
}
