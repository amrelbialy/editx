import { Image, ImageUp, User } from "lucide-react";
import { SAMPLE_LANDSCAPE, SAMPLE_PORTRAIT } from "../playground.constants";

interface Props {
  onImageChange: (src: string | File) => void;
}

function ImageButton(props: { icon: React.ElementType; label: string; onClick: () => void }) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
    >
      <Icon className="size-3.5 text-zinc-400 dark:text-zinc-500" />
      {props.label}
    </button>
  );
}

export function ImageSourceSection(props: Props) {
  const { onImageChange } = props;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageChange(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <ImageButton
        icon={Image}
        label="Sample Landscape"
        onClick={() => onImageChange(SAMPLE_LANDSCAPE)}
      />
      <ImageButton
        icon={User}
        label="Sample Portrait"
        onClick={() => onImageChange(SAMPLE_PORTRAIT)}
      />
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-transparent px-3 py-2 text-xs text-zinc-500 transition-colors hover:border-violet-400 hover:text-violet-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-violet-600 dark:hover:text-violet-400">
        <ImageUp className="size-3.5" />
        Upload your own
        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </label>
    </div>
  );
}
