import {
  colorToHex,
  hexToColor,
  type PageProperties,
  type PagePropertiesUpdate,
} from "@editx/engine";
import { Button, ColorSwatch, Input } from "@editx/image-editor";
import { useEffect, useState } from "react";

interface Props {
  page: PageProperties;
  disabled: boolean;
  onApply: (update: PagePropertiesUpdate) => void;
}

export function PagePropertiesForm(props: Props) {
  const { page, disabled, onApply } = props;

  const [name, setName] = useState(page.name);
  const [width, setWidth] = useState(String(page.width));
  const [height, setHeight] = useState(String(page.height));
  const [color, setColor] = useState(colorToHex({ ...page.backgroundColor, a: 1 }));
  const [alpha, setAlpha] = useState(String(page.backgroundColor.a));
  const [label, setLabel] = useState(page.metadata?.thumbnailAlt ?? "");

  const currentColor = colorToHex({ ...page.backgroundColor, a: 1 });
  const currentLabel = page.metadata?.thumbnailAlt ?? "";

  useEffect(() => {
    setName(page.name);
    setWidth(String(page.width));
    setHeight(String(page.height));
    setColor(currentColor);
    setAlpha(String(page.backgroundColor.a));
    setLabel(currentLabel);
  }, [page.name, page.width, page.height, page.backgroundColor.a, currentColor, currentLabel]);

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onApply({
          name,
          width: Number.parseFloat(width),
          height: Number.parseFloat(height),
          backgroundColor: { ...hexToColor(color), a: Number.parseFloat(alpha) },
          metadata:
            label === currentLabel ? page.metadata : { ...page.metadata, thumbnailAlt: label },
        });
      }}
    >
      <Input
        type="text"
        label="Name"
        labelClassName="w-12"
        aria-label="Page name"
        value={name}
        disabled={disabled}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        type="number"
        label="Width"
        labelClassName="w-12"
        aria-label="Page width"
        value={width}
        step="any"
        disabled={disabled}
        onChange={(event) => setWidth(event.target.value)}
        suffix="px"
      />
      <Input
        type="number"
        label="Height"
        labelClassName="w-12"
        aria-label="Page height"
        value={height}
        step="any"
        disabled={disabled}
        onChange={(event) => setHeight(event.target.value)}
        suffix="px"
      />
      <div className="flex items-center gap-1.5">
        <span className="w-12 text-xs text-muted-foreground">Color</span>
        <ColorSwatch
          value={color}
          aria-label="Page background"
          disabled={disabled}
          onChange={(event) => setColor(event.target.value)}
        />
        <code className="text-xs">{color}</code>
      </div>
      <Input
        type="number"
        label="Alpha"
        labelClassName="w-12"
        aria-label="Background alpha"
        value={alpha}
        step="any"
        disabled={disabled}
        onChange={(event) => setAlpha(event.target.value)}
      />
      <Input
        type="text"
        label="UI label"
        labelClassName="w-12"
        aria-label="Page UI label"
        value={label}
        disabled={disabled}
        onChange={(event) => setLabel(event.target.value)}
      />
      <Button type="submit" className="px-2" disabled={disabled}>
        Apply page properties
      </Button>
      <p className="text-xs text-muted-foreground">
        One undo step. Resizing changes bounds, not artwork. Invalid values report an error.
      </p>
    </form>
  );
}
