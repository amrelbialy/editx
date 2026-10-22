export const EDITX_ARCHIVE_KIND = "editx-archive" as const;
export const EDITX_ARCHIVE_SCHEMA_VERSION = 1 as const;
export const EDITX_ARCHIVE_MEDIA_TYPE = "application/vnd.editx+zip" as const;

export const EDITX_ARCHIVE_PATHS = Object.freeze({
  manifest: "manifest.json",
  document: "document.json",
  assetsManifest: "assets/manifest.json",
  fontsManifest: "fonts/manifest.json",
  preview: "previews/preview.png",
} as const);

export interface EditxArchiveManifestV1 {
  readonly kind: typeof EDITX_ARCHIVE_KIND;
  readonly schemaVersion: typeof EDITX_ARCHIVE_SCHEMA_VERSION;
  readonly selfContained: false;
  readonly members: {
    readonly document: "document.json";
    readonly assetsManifest: "assets/manifest.json";
    readonly fontsManifest: "fonts/manifest.json";
    readonly preview?: "previews/preview.png";
  };
}

export type EditxArchiveAssetClassification =
  | "external-url"
  | "inline-data"
  | "blob-url"
  | "relative-or-opaque"
  | "unresolved";

export interface EditxArchiveAssetLocationV1 {
  readonly blockId: number;
  readonly property: "image/src" | "fill/image/src";
}

interface EditxArchiveAssetBaseV1 {
  readonly id: string;
  readonly type: "image";
  readonly locations: readonly EditxArchiveAssetLocationV1[];
}

export type EditxArchiveAssetDependencyV1 =
  | (EditxArchiveAssetBaseV1 & {
      readonly classification: "inline-data" | "unresolved";
      readonly source?: never;
    })
  | (EditxArchiveAssetBaseV1 & {
      readonly classification: "external-url" | "blob-url" | "relative-or-opaque";
      readonly source: string;
    });

export interface EditxArchiveAssetsManifestV1 {
  readonly kind: "editx-assets-manifest";
  readonly schemaVersion: 1;
  readonly dependencies: readonly EditxArchiveAssetDependencyV1[];
}

export type EditxArchiveFontLocationV1 =
  | {
      readonly blockId: number;
      readonly property: "text/fontFamily";
    }
  | {
      readonly blockId: number;
      readonly property: "text/runs.style.fontFamily";
      readonly runIndex: number | null;
    };

export interface EditxArchiveFontDependencyV1 {
  readonly family: string | null;
  readonly implicit: boolean;
  readonly resolution: "unresolved";
  readonly locations: readonly EditxArchiveFontLocationV1[];
}

export interface EditxArchiveFontsManifestV1 {
  readonly kind: "editx-fonts-manifest";
  readonly schemaVersion: 1;
  readonly dependencies: readonly EditxArchiveFontDependencyV1[];
}

export interface CreateEditxArchiveInput {
  readonly documentJson: string;
  readonly preview?: Uint8Array;
}

export interface SaveEditxArchiveOptions {
  readonly preview?: Uint8Array;
}

export interface EditxArchiveInfoV1 {
  readonly manifest: EditxArchiveManifestV1;
  readonly assets: EditxArchiveAssetsManifestV1;
  readonly fonts: EditxArchiveFontsManifestV1;
}

export interface ReadEditxArchiveResultV1 extends EditxArchiveInfoV1 {
  readonly documentJson: string;
  readonly preview?: Uint8Array;
}
