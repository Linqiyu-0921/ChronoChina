import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './dark-theme.css';
import './reading-collections.css';
let initialTheme = 'dark';
try { const saved = localStorage.getItem('chronochina-original-theme'); if (saved === 'light' || saved === 'dark') initialTheme = saved; } catch {}
document.documentElement.dataset.theme = initialTheme;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
