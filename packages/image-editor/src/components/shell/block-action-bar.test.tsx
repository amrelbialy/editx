import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TooltipProvider } from "../ui";
import { BlockActionBar } from "./block-action-bar";

afterEach(cleanup);

describe("BlockActionBar", () => {
  it("offers Replace for an image-filled graphic when provided", () => {
    const onReplace = vi.fn();
    const { container } = render(
      <I18nProvider>
        <TooltipProvider>
          <BlockActionBar
            blockType="graphic"
            onReplace={onReplace}
            onBringForward={vi.fn()}
            onSendBackward={vi.fn()}
            onBringToFront={vi.fn()}
            onSendToBack={vi.fn()}
            onDuplicate={vi.fn()}
            onDelete={vi.fn()}
            onAlign={vi.fn()}
          />
        </TooltipProvider>
      </I18nProvider>,
    );

    expect(screen.getByRole("button", { name: "Replace Image" })).toBeDefined();
    const file = new File(["image"], "replacement.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });

    expect(onReplace).toHaveBeenCalledWith(file);
  });

  it("renders and dispatches the complete group action set", () => {
    const actions = {
      enterGroup: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      duplicate: vi.fn(),
      deleteBlock: vi.fn(),
    };

    render(
      <I18nProvider>
        <TooltipProvider>
          <BlockActionBar
            blockType="group"
            onEnterGroup={actions.enterGroup}
            onBringForward={actions.bringForward}
            onSendBackward={actions.sendBackward}
            onBringToFront={vi.fn()}
            onSendToBack={vi.fn()}
            onDuplicate={actions.duplicate}
            onDelete={actions.deleteBlock}
            onAlign={vi.fn()}
          />
        </TooltipProvider>
      </I18nProvider>,
    );

    const expectedActions = [
      ["Enter Group", actions.enterGroup],
      ["Bring Forward", actions.bringForward],
      ["Send Backward", actions.sendBackward],
      ["Duplicate", actions.duplicate],
      ["Delete", actions.deleteBlock],
    ] as const;

    for (const [label, action] of expectedActions) {
      fireEvent.click(screen.getByRole("button", { name: label }));
      expect(action).toHaveBeenCalledOnce();
    }
  });
});
