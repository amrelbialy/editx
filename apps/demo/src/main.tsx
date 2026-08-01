import "./index.css";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { Site } from "./site";

const rootElement = document.getElementById("root")!;
const site = (
  <BrowserRouter>
    <Site />
  </BrowserRouter>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, site);
} else {
  createRoot(rootElement).render(site);
}
