// Safe Performance API wrapper to prevent browser DataCloneError and memory leaks
if (typeof window !== "undefined" && window.performance) {
  try {
    const origMeasure = window.performance.measure?.bind(window.performance);
    if (origMeasure) {
      window.performance.measure = function (measureName: string, startOrOptions?: any, endMark?: string) {
        try {
          return origMeasure(measureName, startOrOptions, endMark);
        } catch {
          // If browser throws DataCloneError or Out of Memory during measure, clear buffer and return null
          try {
            window.performance.clearMarks?.();
            window.performance.clearMeasures?.();
          } catch {}
          return undefined as any;
        }
      };
    }

    const origMark = window.performance.mark?.bind(window.performance);
    if (origMark) {
      window.performance.mark = function (markName: string, markOptions?: any) {
        try {
          return origMark(markName, markOptions);
        } catch {
          return undefined as any;
        }
      };
    }
  } catch {}
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Register Service Worker for PWA offline capabilities and installation
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    try {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg?.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service Worker registration skipped:", err);
        });
    } catch (e) {
      console.warn("[PWA] Service Worker init:", e);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

