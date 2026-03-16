import { useEffect, useRef, useCallback } from 'react';
import { useRfq } from '../context/RfqContext';

export function useWebSocket() {
  const wsRef = useRef(null);
  const { dispatch } = useRfq();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'stream_start') {
          dispatch({ type: 'STREAM_START' });
        } else if (msg.type === 'stream_token') {
          dispatch({ type: 'STREAM_TOKEN', token: msg.token });
        } else if (msg.type === 'stream_end') {
          dispatch({
            type: 'STREAM_END',
            text: msg.text,
            structured: msg.structured || {},
          });
        } else if (msg.type === 'typing') {
          // Backward compat — non-streaming fallback
          dispatch({ type: 'SET_TYPING', value: true });
        } else if (msg.type === 'agent_response') {
          // Backward compat — non-streaming fallback
          dispatch({
            type: 'ADD_AGENT_MESSAGE',
            text: msg.text,
            structured: msg.structured || {},
          });
        } else if (msg.type === 'error') {
          dispatch({
            type: 'ADD_AGENT_MESSAGE',
            text: msg.text,
            structured: {},
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.log('[WS] Connection closed');
    };

    return () => {
      ws.close();
    };
  }, [dispatch]);

  const sendMessage = useCallback((text) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      dispatch({ type: 'ADD_USER_MESSAGE', text });
      wsRef.current.send(JSON.stringify({ type: 'user_message', text }));
    }
  }, [dispatch]);

  return { sendMessage };
}
