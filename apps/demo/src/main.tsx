import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./app";
import { EditorPlayground } from "./components/editor-playground";
import { Navbar } from "./components/navbar";

import EngineBlocks from "./docs/engine/blocks.mdx";
import EngineCommands from "./docs/engine/commands.mdx";
import EngineOverview from "./docs/engine/overview.mdx";
import IeApi from "./docs/image-editor/api.mdx";
import IeConfiguration from "./docs/image-editor/configuration.mdx";
import IeGettingStarted from "./docs/image-editor/getting-started.mdx";
import IeTheming from "./docs/image-editor/theming.mdx";

import "./index.css";
import { DocsIndex } from "./pages/docs-index";
import { DocsPage } from "./pages/docs-page";
import { LandingPage } from "./pages/landing";
import { NotFoundPage } from "./pages/not-found";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/playground" element={<EditorPlayground />} />
      <Route path="/demo" element={<App />} />

      {/* Docs */}
      <Route path="/docs" element={<DocsIndex />} />
      <Route
        path="/docs/image-editor/getting-started"
        element={<DocsPage component={IeGettingStarted} />}
      />
      <Route
        path="/docs/image-editor/configuration"
        element={<DocsPage component={IeConfiguration} />}
      />
      <Route path="/docs/image-editor/api" element={<DocsPage component={IeApi} />} />
      <Route path="/docs/image-editor/theming" element={<DocsPage component={IeTheming} />} />
      <Route path="/docs/engine/overview" element={<DocsPage component={EngineOverview} />} />
      <Route path="/docs/engine/blocks" element={<DocsPage component={EngineBlocks} />} />
      <Route path="/docs/engine/commands" element={<DocsPage component={EngineCommands} />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>,
);
