import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Main stylesheet for the entire app

// Render the main App component into the 'root' div in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the Progressive Web App (PWA) service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // The underscore before '_registration' tells TypeScript we are intentionally not using the variable
    navigator.serviceWorker.register('/sw.js').then(_registration => {
      console.log('ServiceWorker registered successfully.');
    }).catch(error => {
      console.log('ServiceWorker registration failed: ', error);
    });
  });
}
