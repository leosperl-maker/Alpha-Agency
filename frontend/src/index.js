import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
  // Quand un nouveau service worker prend le contrôle (nouveau déploiement),
  // on recharge la page une seule fois pour appliquer la nouvelle version
  // sans que l'utilisateur ait à vider son cache.
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        // Vérifie périodiquement la présence d'une nouvelle version
        setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
