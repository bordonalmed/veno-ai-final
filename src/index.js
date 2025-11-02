import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suprimir erros do MetaMask silenciosamente (já configurado no index.html, mas reforçando aqui)
if (typeof window !== 'undefined') {
  // Sobrescrever console.error novamente (caso alguma biblioteca tenha sobrescrito)
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('MetaMask') || 
        message.includes('metamask') || 
        message.includes('MetaMask extension not found') ||
        message.includes('Failed to connect to MetaMask')) {
      return; // Não mostrar
    }
    originalError.apply(console, args);
  };
  
  // Suprimir promessas rejeitadas do MetaMask
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason) {
      const reason = event.reason.message || event.reason.toString() || '';
      if (reason.includes('MetaMask') ||
          reason.includes('metamask') ||
          reason.includes('MetaMask extension not found') ||
          reason.includes('Failed to connect to MetaMask')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }
  }, true);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 