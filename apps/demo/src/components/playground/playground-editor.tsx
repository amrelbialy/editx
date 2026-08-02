import type { ImageEditorConfig } from "@editx/image-editor";
import { ImageEditor } from "@editx/image-editor";

interface Props {
  src: string | File;
  config: ImageEditorConfig;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export function PlaygroundEditor(props: Props) {
  const { src, config, onSave, onClose } = props;

  return (
    <ImageEditor
      src={src}
      config={config}
      onSave={onSave}
      onClose={onClose}
      width="100%"
      height="100%"
    />
  );
}
