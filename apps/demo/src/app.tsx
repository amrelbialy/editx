import {
  Button,
  ImageEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  type ThemeConfig,
  ThemeProvider,
} from "@creative-editor/image-editor";
import { GripVertical, ImageIcon, Link, Upload } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { demoPresets } from "./theme/presets";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200";

/** Built-in presets (shipped with the package) + demo-only showcase presets. */
const ALL_PRESETS = ["dark", "light", ...Object.keys(demoPresets)] as const;
type PresetName = (typeof ALL_PRESETS)[number];

function App() {
  const [mode, setMode] = useState<"image-editor" | "pick">("pick");
  const [imageSrc, setImageSrc] = useState<string | File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [themePreset, setThemePreset] = useState<PresetName>("dark");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageSrc(file);
      setMode("image-editor");
    }
  };

  const handleUseSample = () => {
    setImageSrc(SAMPLE_IMAGE);
    setMode("image-editor");
  };

  const handleLoadUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      setImageSrc(trimmed);
      setMode("image-editor");
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLoadUrl();
  };

  // --- Drag-and-drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      setImageSrc(file);
      setMode("image-editor");
      return;
    }
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      setImageSrc(url);
      setMode("image-editor");
    }
  }, []);

  // --- Clipboard paste ---
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          setImageSrc(blob);
          setMode("image-editor");
          return;
        }
      }
    }
  }, []);

  const handleThemeChange = useCallback((value: string) => {
    setThemePreset(value as PresetName);
  }, []);

  /** Resolve preset name to a ThemeConfig object. */
  const themeConfig = useMemo((): ThemeConfig => {
    // Built-in presets (dark / light) — pass by name
    if (themePreset === "dark" || themePreset === "light") {
      return { preset: themePreset };
    }
    // Demo presets — pass colors directly
    const colors = demoPresets[themePreset];
    return colors ? { preset: "custom", colors } : { preset: "dark" };
  }, [themePreset]);

  const config = useMemo(() => ({ theme: themeConfig }), [themeConfig]);

  const handleSave = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited-image.${blob.type.split("/")[1] || "png"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  if (mode === "image-editor" && imageSrc) {
    return (
      <ImageEditor
        src={imageSrc}
        onSave={handleSave}
        config={config}
        slots={{
          topbarRight: (
            <Select value={themePreset} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_PRESETS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ),
        }}
      />
    );
  }

  return (
    <ThemeProvider theme={themeConfig}>
      <div className="flex flex-col items-center justify-center h-screen p-8" onPaste={handlePaste}>
        {/* Card */}
        <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl shadow-lg p-8 flex flex-col items-center gap-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Creative Image Editor</h1>
            <p className="text-sm text-muted-foreground">Choose an image to get started</p>
          </div>

          <Separator />

          {/* File upload + sample */}
          <div className="flex gap-3 w-full">
            <label className="flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-8 cursor-pointer">
              <Upload className="size-4" />
              Upload Image
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <Button variant="secondary" size="lg" className="flex-1" onClick={handleUseSample}>
              <ImageIcon className="size-4" />
              Sample
            </Button>
          </div>

          {/* URL input */}
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="Paste an image URL..."
              className="flex-1 h-9 px-3 bg-transparent border border-input rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              onClick={handleLoadUrl}
              disabled={!urlInput.trim()}
              variant="outline"
              size="default"
            >
              <Link className="size-4 mr-1.5" />
              Load
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span>or</span>
            <Separator className="flex-1" />
          </div>

          {/* Drag-and-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              w-full h-32 flex flex-col items-center justify-center gap-2
              border-2 border-dashed rounded-lg transition-colors cursor-pointer
              ${
                isDragging
                  ? "border-ring bg-accent/20 text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              }
            `}
          >
            <GripVertical className="size-5" />
            <span className="text-sm">
              {isDragging ? "Drop image here..." : "Drag & drop an image here"}
            </span>
          </div>

          {/* Paste hint */}
          <p className="text-muted-foreground text-xs">
            Or paste from clipboard with{" "}
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[11px] font-mono text-foreground">
              Ctrl+V
            </kbd>
          </p>
        </div>

        {/* Theme switcher outside card */}
        <div className="mt-4">
          <Select value={themePreset} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_PRESETS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
