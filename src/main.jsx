import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import SwagStackApp from "./swagstack/SwagStackApp.jsx";
import { isSwagStackPath } from "./swagstack/lib/path.js";
import { startClientPwa } from "./pwa.js";
import "./styles.css";

startClientPwa();

const Root = isSwagStackPath() ? SwagStackApp : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
