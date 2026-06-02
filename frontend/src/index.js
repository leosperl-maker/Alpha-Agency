import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Service Worker : uniquement en PRODUCTION (PWA offline).
// En dev, on désenregistre tout SW existant pour qu'aucun cache périmé
// ne masque les changements (cause du "je ne vois pas mes modifs").
if ('serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          setInterval(() => registration.update(), 60 * 60 * 1000);
        })
        .catch((error) => {
          console.log('ServiceWorker registration failed:', error);
        });
    });
  } else {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
