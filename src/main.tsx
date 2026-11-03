import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './dark-theme.css';
import './reading-collections.css';
import './mobile.css';
import { applyLang, detectLang, ensureLang } from './lib/i18n';
let initialTheme = 'light';
try { const saved = localStorage.getItem('chronochina-original-theme'); if (saved === 'light' || saved === 'dark') initialTheme = saved; } catch {}
document.documentElement.dataset.theme = initialTheme;

const lang = detectLang();
const boot = () => {
  applyLang(lang);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};
if (lang === 'zh-Hant') ensureLang(lang).then(boot); else boot();
