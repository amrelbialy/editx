import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./app";
import { EditorPlayground } from "./components/editor-playground";
import { Navbar } from "./components/navbar";

import EngineBlockApi from "./docs/engine/block-api.mdx";
import EngineBlocks from "./docs/engine/blocks.mdx";
import EngineEditorApi from "./docs/engine/editor-api.mdx";
import EngineApi from "./docs/engine/engine-api.mdx";
import EngineOverview from "./docs/engine/overview.mdx";
import EngineSceneApi from "./docs/engine/scene-api.mdx";
import IeApi from "./docs/image-editor/api.mdx";
import IeConfiguration from "./docs/image-editor/configuration.mdx";
import IeGettingStarted from "./docs/image-editor/getting-started.mdx";
import IeRecipeCustomTheme from "./docs/image-editor/recipes/custom-theme.mdx";
import IeRecipeCustomTool from "./docs/image-editor/recipes/custom-tool.mdx";
import IeRecipeExportFormats from "./docs/image-editor/recipes/export-formats.mdx";
import IeRecipeInjectSlots from "./docs/image-editor/recipes/inject-slots.mdx";
import IeRecipeLimitTools from "./docs/image-editor/recipes/limit-tools.mdx";
import IeRecipeLocalize from "./docs/image-editor/recipes/localize.mdx";
import IeRecipeOpenInModal from "./docs/image-editor/recipes/open-in-modal.mdx";
import IeRecipeTrackToolChanges from "./docs/image-editor/recipes/track-tool-changes.mdx";
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
      <Route
        path="/docs/image-editor/recipes/limit-tools"
        element={<DocsPage component={IeRecipeLimitTools} />}
      />
      <Route
        path="/docs/image-editor/recipes/custom-theme"
        element={<DocsPage component={IeRecipeCustomTheme} />}
      />
      <Route
        path="/docs/image-editor/recipes/localize"
        element={<DocsPage component={IeRecipeLocalize} />}
      />
      <Route
        path="/docs/image-editor/recipes/export-formats"
        element={<DocsPage component={IeRecipeExportFormats} />}
      />
      <Route
        path="/docs/image-editor/recipes/custom-tool"
        element={<DocsPage component={IeRecipeCustomTool} />}
      />
      <Route
        path="/docs/image-editor/recipes/inject-slots"
        element={<DocsPage component={IeRecipeInjectSlots} />}
      />
      <Route
        path="/docs/image-editor/recipes/track-tool-changes"
        element={<DocsPage component={IeRecipeTrackToolChanges} />}
      />
      <Route
        path="/docs/image-editor/recipes/open-in-modal"
        element={<DocsPage component={IeRecipeOpenInModal} />}
      />
      <Route path="/docs/engine/overview" element={<DocsPage component={EngineOverview} />} />
      <Route path="/docs/engine/blocks" element={<DocsPage component={EngineBlocks} />} />
      <Route path="/docs/engine/engine-api" element={<DocsPage component={EngineApi} />} />
      <Route path="/docs/engine/block-api" element={<DocsPage component={EngineBlockApi} />} />
      <Route path="/docs/engine/editor-api" element={<DocsPage component={EngineEditorApi} />} />
      <Route path="/docs/engine/scene-api" element={<DocsPage component={EngineSceneApi} />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BrowserRouter>,
);
