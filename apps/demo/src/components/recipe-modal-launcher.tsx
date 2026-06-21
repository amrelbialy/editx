import { ImageEditorModal } from "@editx/image-editor";
import { useState } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the open-in-modal recipe: a button that opens the editor in a
 * controlled <ImageEditorModal>.
 */
export function RecipeModalLauncher() {
  const [dark] = useDarkMode();

  const [open, setOpen] = useState(false);

  return (
    <div className="not-prose my-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
      >
        Edit image
      </button>
      <ImageEditorModal
        open={open}
        onOpenChange={setOpen}
        src={SAMPLE_IMAGE}
        config={{
          theme: { preset: dark ? "dark" : "light" },
          ui: { unsavedChangesWarning: false },
        }}
      />
    </div>
  );
}
