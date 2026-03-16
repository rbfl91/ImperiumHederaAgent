import { createContext, useContext, useReducer } from 'react';

const RfqContext = createContext();

const STAGES = ['introduction', 'investment_summary', 'beneficiary_info', 'final_review'];

const initialState = {
  messages: [],
  currentStage: 'introduction',
  completedStages: [],
  progress: 0,
  details: {},
  quotes: null,
  isTyping: false,
  isStreaming: false,
  sessionEnded: false,
};

/** Apply structured data (stage, details, quotes, investment card) to state */
function applyStructured(newState, structured) {
  if (structured?.stage) {
    const stageId = structured.stage.stage;
    const stageIdx = STAGES.indexOf(stageId);
    const completed = STAGES.slice(0, stageIdx);
    newState.currentStage = stageId;
    newState.completedStages = completed;
    newState.progress = structured.stage.progress || Math.round(((stageIdx + 1) / STAGES.length) * 100);
  }
  if (structured?.details) {
    newState.details = { ...newState.details, ...structured.details };
  }
  if (structured?.quotes) {
    newState.quotes = structured.quotes;
    if (structured.quotes.length > 0) {
      newState.details = {
        ...newState.details,
        topRate: structured.quotes[0].rate,
        topProvider: structured.quotes[0].provider,
      };
    }
  }
  if (structured?.investment_card) {
    newState.progress = 100;
    newState.completedStages = [...STAGES];
  }
  return newState;
}

function rfqReducer(state, action) {
  switch (action.type) {
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', text: action.text }],
      };

    case 'ADD_AGENT_MESSAGE': {
      const { text, structured } = action;
      let newState = {
        ...state,
        isTyping: false,
        isStreaming: false,
        messages: [...state.messages, { role: 'agent', text, structured }],
      };
      return applyStructured(newState, structured);
    }

    // ── Streaming actions ──────────────────────────────────────────
    case 'STREAM_START':
      return {
        ...state,
        isTyping: false,
        isStreaming: true,
        messages: [...state.messages, { role: 'agent', text: '', structured: {}, streaming: true }],
      };

    case 'STREAM_TOKEN': {
      const msgs = [...state.messages];
      const lastIdx = msgs.length - 1;
      if (lastIdx >= 0 && msgs[lastIdx].streaming) {
        msgs[lastIdx] = { ...msgs[lastIdx], text: msgs[lastIdx].text + action.token };
      }
      return { ...state, messages: msgs };
    }

    case 'STREAM_END': {
      const { text, structured } = action;
      const messages = [...state.messages];
      const idx = messages.length - 1;
      if (idx >= 0 && messages[idx].streaming) {
        messages[idx] = { role: 'agent', text, structured, streaming: false, streamed: true };
      }
      let newState = { ...state, messages, isStreaming: false };
      return applyStructured(newState, structured);
    }

    case 'SET_TYPING':
      return { ...state, isTyping: action.value };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function RfqProvider({ children }) {
  const [state, dispatch] = useReducer(rfqReducer, initialState);
  return (
    <RfqContext.Provider value={{ state, dispatch }}>
      {children}
    </RfqContext.Provider>
  );
}

export function useRfq() {
  return useContext(RfqContext);
}

export { STAGES };
