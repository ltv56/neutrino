import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { SessionsProvider } from "@/contexts";

function App() {
  return (
    <SessionsProvider>
      <Routes>
        <Route path="/*" element={<Layout />} />
      </Routes>
    </SessionsProvider>
  );
}

export default App;
