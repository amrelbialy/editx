import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router";
import App from "./app";
import { EditorPlayground } from "./components/editor-playground";
import { Navbar } from "./components/navbar";
import { Seo } from "./components/seo";

import EngineBlockApi from "./docs/engine/block-api.mdx";
import EngineBlocks from "./docs/engine/blocks.mdx";
import EngineEditorApi from "./docs/engine/editor-api.mdx";
import EngineApi from "./docs/engine/engine-api.mdx";
import EngineOverview from "./docs/engine/overview.mdx";
import EngineSceneApi from "./docs/engine/scene-api.mdx";
import IeApi from "./docs/image-editor/api.mdx";
import IeConfiguration from "./docs/image-editor/configuration.mdx";
import IeGettingStarted from "./docs/image-editor/getting-started.mdx";
import IeGuideConfigureAdjustments from "./docs/image-editor/guides/configure-adjustments.mdx";
import IeGuideConfigureCrop from "./docs/image-editor/guides/configure-crop.mdx";
import IeGuideConfigureFilters from "./docs/image-editor/guides/configure-filters.mdx";
import IeGuideConfigureFonts from "./docs/image-editor/guides/configure-fonts.mdx";
import IeGuideConfigureShapes from "./docs/image-editor/guides/configure-shapes.mdx";
import IeGuideCustomTheme from "./docs/image-editor/guides/custom-theme.mdx";
import IeGuideCustomTool from "./docs/image-editor/guides/custom-tool.mdx";
import IeGuideCustomizeChrome from "./docs/image-editor/guides/customize-chrome.mdx";
import IeGuideCustomizeToolbar from "./docs/image-editor/guides/customize-toolbar.mdx";
import IeGuideExportAndSave from "./docs/image-editor/guides/export-and-save.mdx";
import IeGuideImageUploadLimits from "./docs/image-editor/guides/image-upload-limits.mdx";
import IeGuideInjectSlots from "./docs/image-editor/guides/inject-slots.mdx";
import IeGuideLocalize from "./docs/image-editor/guides/localize.mdx";
import IeGuideOpenInModal from "./docs/image-editor/guides/open-in-modal.mdx";
import IeGuideSaveLoadScene from "./docs/image-editor/guides/save-load-scene.mdx";
import IeGuideTrackToolChanges from "./docs/image-editor/guides/track-tool-changes.mdx";
import IeGuideVanillaMount from "./docs/image-editor/guides/vanilla-mount.mdx";
import IeGuideWebComponent from "./docs/image-editor/guides/web-component.mdx";
import IeTheming from "./docs/image-editor/theming.mdx";
import { DocsIndex } from "./pages/docs-index";
import { DocsPage } from "./pages/docs-page";
import { LandingPage } from "./pages/landing";
import { NotFoundPage } from "./pages/not-found";

const DOC_ROUTES: { path: string; component: ComponentType }[] = [
  { path: "/docs/image-editor/getting-started", component: IeGettingStarted },
  { path: "/docs/image-editor/configuration", component: IeConfiguration },
  { path: "/docs/image-editor/api", component: IeApi },
  { path: "/docs/image-editor/theming", component: IeTheming },
  { path: "/docs/image-editor/guides/configure-crop", component: IeGuideConfigureCrop },
  {
    path: "/docs/image-editor/guides/configure-adjustments",
    component: IeGuideConfigureAdjustments,
  },
  { path: "/docs/image-editor/guides/configure-filters", component: IeGuideConfigureFilters },
  { path: "/docs/image-editor/guides/configure-fonts", component: IeGuideConfigureFonts },
  { path: "/docs/image-editor/guides/configure-shapes", component: IeGuideConfigureShapes },
  { path: "/docs/image-editor/guides/image-upload-limits", component: IeGuideImageUploadLimits },
  { path: "/docs/image-editor/guides/customize-toolbar", component: IeGuideCustomizeToolbar },
  { path: "/docs/image-editor/guides/custom-tool", component: IeGuideCustomTool },
  { path: "/docs/image-editor/guides/inject-slots", component: IeGuideInjectSlots },
  { path: "/docs/image-editor/guides/customize-chrome", component: IeGuideCustomizeChrome },
  { path: "/docs/image-editor/guides/custom-theme", component: IeGuideCustomTheme },
  { path: "/docs/image-editor/guides/localize", component: IeGuideLocalize },
  { path: "/docs/image-editor/guides/export-and-save", component: IeGuideExportAndSave },
  { path: "/docs/image-editor/guides/track-tool-changes", component: IeGuideTrackToolChanges },
  { path: "/docs/image-editor/guides/save-load-scene", component: IeGuideSaveLoadScene },
  { path: "/docs/image-editor/guides/open-in-modal", component: IeGuideOpenInModal },
  { path: "/docs/image-editor/guides/vanilla-mount", component: IeGuideVanillaMount },
  { path: "/docs/image-editor/guides/web-component", component: IeGuideWebComponent },
  { path: "/docs/engine/overview", component: EngineOverview },
  { path: "/docs/engine/blocks", component: EngineBlocks },
  { path: "/docs/engine/engine-api", component: EngineApi },
  { path: "/docs/engine/block-api", component: EngineBlockApi },
  { path: "/docs/engine/editor-api", component: EngineEditorApi },
  { path: "/docs/engine/scene-api", component: EngineSceneApi },
];

const DOC_REDIRECTS = [
  ["/docs/image-editor/guides/configure-crop-ratios", "/docs/image-editor/guides/configure-crop"],
  ["/docs/image-editor/guides/limit-tools", "/docs/image-editor/guides/customize-toolbar"],
  ["/docs/image-editor/guides/set-default-tool", "/docs/image-editor/guides/customize-toolbar"],
  ["/docs/image-editor/guides/compact-sidebar", "/docs/image-editor/guides/customize-toolbar"],
  ["/docs/image-editor/guides/export-formats", "/docs/image-editor/guides/export-and-save"],
  ["/docs/image-editor/guides/watermark-on-save", "/docs/image-editor/guides/export-and-save"],
  ["/docs/image-editor/guides/save-and-close", "/docs/image-editor/guides/export-and-save"],
] as const;

export function Site() {
  return (
    <>
      <Seo />
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/playground" element={<EditorPlayground />} />
        <Route path="/demo" element={<App />} />
        <Route path="/docs" element={<DocsIndex />} />
        {DOC_ROUTES.map(({ path, component }) => (
          <Route key={path} path={path} element={<DocsPage component={component} />} />
        ))}
        {DOC_REDIRECTS.map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
