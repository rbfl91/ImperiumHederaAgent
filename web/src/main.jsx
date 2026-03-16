import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RfqProvider } from './context/RfqContext';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RfqProvider>
      <App />
    </RfqProvider>
  </React.StrictMode>
);
