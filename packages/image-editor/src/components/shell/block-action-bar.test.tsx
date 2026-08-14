import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/i18n-context";
import { TooltipProvider } from "../ui";
import { BlockActionBar } from "./block-action-bar";

afterEach(cleanup);

describe("BlockActionBar", () => {
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
