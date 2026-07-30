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
import IeGuideCompactSidebar from "./docs/image-editor/guides/compact-sidebar.mdx";
import IeGuideConfigureAdjustments from "./docs/image-editor/guides/configure-adjustments.mdx";
import IeGuideConfigureCrop from "./docs/image-editor/guides/configure-crop.mdx";
import IeGuideConfigureCropRatios from "./docs/image-editor/guides/configure-crop-ratios.mdx";
import IeGuideConfigureFilters from "./docs/image-editor/guides/configure-filters.mdx";
import IeGuideConfigureFonts from "./docs/image-editor/guides/configure-fonts.mdx";
import IeGuideConfigureShapes from "./docs/image-editor/guides/configure-shapes.mdx";
import IeGuideCustomTheme from "./docs/image-editor/guides/custom-theme.mdx";
import IeGuideCustomTool from "./docs/image-editor/guides/custom-tool.mdx";
import IeGuideCustomizeChrome from "./docs/image-editor/guides/customize-chrome.mdx";
import IeGuideExportFormats from "./docs/image-editor/guides/export-formats.mdx";
import IeGuideImageUploadLimits from "./docs/image-editor/guides/image-upload-limits.mdx";
import IeGuideInjectSlots from "./docs/image-editor/guides/inject-slots.mdx";
import IeGuideLimitTools from "./docs/image-editor/guides/limit-tools.mdx";
import IeGuideLocalize from "./docs/image-editor/guides/localize.mdx";
import IeGuideOpenInModal from "./docs/image-editor/guides/open-in-modal.mdx";
import IeGuideSaveAndClose from "./docs/image-editor/guides/save-and-close.mdx";
import IeGuideSaveLoadScene from "./docs/image-editor/guides/save-load-scene.mdx";
import IeGuideSetDefaultTool from "./docs/image-editor/guides/set-default-tool.mdx";
import IeGuideTrackToolChanges from "./docs/image-editor/guides/track-tool-changes.mdx";
import IeGuideVanillaMount from "./docs/image-editor/guides/vanilla-mount.mdx";
import IeGuideWatermarkOnSave from "./docs/image-editor/guides/watermark-on-save.mdx";
import IeGuideWebComponent from "./docs/image-editor/guides/web-component.mdx";
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
        path="/docs/image-editor/guides/limit-tools"
        element={<DocsPage component={IeGuideLimitTools} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-crop"
        element={<DocsPage component={IeGuideConfigureCrop} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-adjustments"
        element={<DocsPage component={IeGuideConfigureAdjustments} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-filters"
        element={<DocsPage component={IeGuideConfigureFilters} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-fonts"
        element={<DocsPage component={IeGuideConfigureFonts} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-shapes"
        element={<DocsPage component={IeGuideConfigureShapes} />}
      />
      <Route
        path="/docs/image-editor/guides/configure-crop-ratios"
        element={<DocsPage component={IeGuideConfigureCropRatios} />}
      />
      <Route
        path="/docs/image-editor/guides/set-default-tool"
        element={<DocsPage component={IeGuideSetDefaultTool} />}
      />
      <Route
        path="/docs/image-editor/guides/compact-sidebar"
        element={<DocsPage component={IeGuideCompactSidebar} />}
      />
      <Route
        path="/docs/image-editor/guides/image-upload-limits"
        element={<DocsPage component={IeGuideImageUploadLimits} />}
      />
      <Route
        path="/docs/image-editor/guides/save-load-scene"
        element={<DocsPage component={IeGuideSaveLoadScene} />}
      />
      <Route
        path="/docs/image-editor/guides/customize-chrome"
        element={<DocsPage component={IeGuideCustomizeChrome} />}
      />
      <Route
        path="/docs/image-editor/guides/watermark-on-save"
        element={<DocsPage component={IeGuideWatermarkOnSave} />}
      />
      <Route
        path="/docs/image-editor/guides/save-and-close"
        element={<DocsPage component={IeGuideSaveAndClose} />}
      />
      <Route
        path="/docs/image-editor/guides/custom-theme"
        element={<DocsPage component={IeGuideCustomTheme} />}
      />
      <Route
        path="/docs/image-editor/guides/localize"
        element={<DocsPage component={IeGuideLocalize} />}
      />
      <Route
        path="/docs/image-editor/guides/export-formats"
        element={<DocsPage component={IeGuideExportFormats} />}
      />
      <Route
        path="/docs/image-editor/guides/custom-tool"
        element={<DocsPage component={IeGuideCustomTool} />}
      />
      <Route
        path="/docs/image-editor/guides/inject-slots"
        element={<DocsPage component={IeGuideInjectSlots} />}
      />
      <Route
        path="/docs/image-editor/guides/track-tool-changes"
        element={<DocsPage component={IeGuideTrackToolChanges} />}
      />
      <Route
        path="/docs/image-editor/guides/open-in-modal"
        element={<DocsPage component={IeGuideOpenInModal} />}
      />
      <Route
        path="/docs/image-editor/guides/vanilla-mount"
        element={<DocsPage component={IeGuideVanillaMount} />}
      />
      <Route
        path="/docs/image-editor/guides/web-component"
        element={<DocsPage component={IeGuideWebComponent} />}
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
