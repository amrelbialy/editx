export interface PlaygroundConfig {
  theme: string;
  tools: string[];
  exportFormat: "png" | "jpeg" | "webp";
  exportQuality: number;
  showTitle: boolean;
  unsavedChangesWarning: boolean;
  borderRadius?: string;
}
