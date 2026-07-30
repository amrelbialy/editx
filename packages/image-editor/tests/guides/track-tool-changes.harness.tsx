import { useState } from "react";
import { ImageEditor } from "../../src/image-editor";

/**
 * Test story for the track-tool-changes guide. The `events.onToolChange`
 * callback is a function, so it lives in an importable module (not inline in the
 * spec) and writes the latest tool id into a queryable element.
 */
export const TrackToolChangesHarness = () => {
  const [lastTool, setLastTool] = useState<string>("none");

  return (
    <div>
      <ImageEditor
        src="/fixtures/test-image-100x100.png"
        width="900px"
        height="600px"
        events={{ onToolChange: (toolId) => setLastTool(toolId ?? "none") }}
      />
      <div data-testid="last-tool">{lastTool}</div>
    </div>
  );
};
