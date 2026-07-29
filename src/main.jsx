import React from "react";
import { createRoot } from "react-dom/client";
import KaMaSe from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KaMaSe />
  </React.StrictMode>
);
