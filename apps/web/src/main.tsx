import React from "react";
import ReactDOM from "react-dom/client";
import { ExcelidrawApp } from "@repo/ui";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ExcelidrawApp />
  </React.StrictMode>
);