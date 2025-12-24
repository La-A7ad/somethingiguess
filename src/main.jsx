import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/global.css";
import "./styles/components.css";
import App from "./App.jsx";
import { startMockServer } from "./services/api.js";

startMockServer();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
