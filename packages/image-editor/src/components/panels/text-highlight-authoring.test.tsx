import type { EditxEngine } from "@editx/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TextBackgroundSection } from "./text-background-section.component";

vi.mock("../ui/slider", () => ({
  Slider: (props: {
    min: number;
    max: number;
    step: number;
    value: number[];
    onValueChange: (value: number[]) => void;
  }) => (
    <input
      type="range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value[0]}
      onChange={(event) => props.onValueChange([Number(event.target.value)])}
    />
  ),
}));

function makeEngine() {
  const block = {
    getTextRuns: vi.fn().mockReturnValue([
      {
        text: "Hello",
        style: { backgroundColor: "#FDE68A", backgroundOpacity: 0.5 },
      },
    ]),
    getTextBackground: vi.fn().mockReturnValue({
      enabled: false,
      color: { r: 0, g: 0, b: 0, a: 1 },
      geometry: "text-union",
      cornerRadius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    supportsTextBackground: vi.fn().mockReturnValue(true),
    getTextCurve: vi.fn().mockReturnValue(null),
    setTextBackgroundOpacity: vi.fn(),
    setTextBackgroundCornerRadius: vi.fn(),
  };
  const engine = {
    block,
    onHistoryChanged: vi.fn().mockReturnValue(() => {}),
    beginBatch: vi.fn(),
    endBatch: vi.fn(),
    renderDirty: vi.fn(),
  } as unknown as EditxEngine;
  return { engine, block };
}

describe("TextBackgroundSection Highlight authoring", () => {
  afterEach(cleanup);

  it("authors opacity and corner radius through the selected range APIs", () => {
    const { engine, block } = makeEngine();
    render(
      <I18nProvider>
        <TextBackgroundSection
          engine={engine}
          blockId={7}
          getStyleRange={() => ({ start: 0, end: 5 })}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Highlight" }));
    const [opacity, cornerRadius] = screen.getAllByRole("slider");
    fireEvent.change(opacity, { target: { value: "0.49" } });
    fireEvent.change(cornerRadius, { target: { value: "1" } });

    expect(block.setTextBackgroundOpacity).toHaveBeenCalledWith(7, 0, 5, 0.49);
    expect(block.setTextBackgroundCornerRadius).toHaveBeenCalledWith(7, 0, 5, 1);
  });
});
