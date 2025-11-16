import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { SessionsProvider, PDFCacheProvider } from "@/contexts";

function App() {
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
