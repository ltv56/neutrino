import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Layout from "@/components/layout/Layout";
import { SessionsProvider, PDFCacheProvider } from "@/contexts";

function App() {
  useEffect(() => {
    // Show window when UI is ready
    invoke('show_main_window').catch(console.error);
  }, []);

  return (
    <SessionsProvider>
      <PDFCacheProvider>
        <Routes>
          <Route path="/*" element={<Layout />} />
        </Routes>
      </PDFCacheProvider>
    </SessionsProvider>
  );
}

export default App;
