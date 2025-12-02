import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Layout from "@/components/layout/Layout";
import FloatingNote from "@/components/floating/FloatingNote";
import { SessionsProvider, PDFCacheProvider } from "@/contexts";
import { ToastProvider } from "@/contexts/ToastContext";

function App() {
  const location = useLocation();
  const isFloatingNote = location.pathname === '/floating-note';

  useEffect(() => {
    // Only show main window if not floating note
    if (!isFloatingNote) {
      invoke('show_main_window').catch(console.error);
    }
  }, [isFloatingNote]);

  return (
    <ToastProvider>
      <SessionsProvider>
        <PDFCacheProvider>
          <Routes>
            <Route path="/floating-note" element={<FloatingNote />} />
            <Route path="/*" element={<Layout />} />
          </Routes>
        </PDFCacheProvider>
      </SessionsProvider>
    </ToastProvider>
  );
}

export default App;
