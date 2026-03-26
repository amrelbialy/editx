import type { ImageEditorConfig } from "@creative-editor/image-editor";
import { ImageEditor } from "@creative-editor/image-editor";

interface Props {
  src: string | File;
  config: ImageEditorConfig;
  onSave: (blob: Blob) => void;
}

export function PlaygroundEditor(props: Props) {
  const { src, config, onSave } = props;

  return <ImageEditor src={src} config={config} onSave={onSave} width="100%" height="100%" />;
}
