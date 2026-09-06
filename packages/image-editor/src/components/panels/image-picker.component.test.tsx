import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImagePicker } from "./image-picker.component";

describe("ImagePicker", () => {
  afterEach(cleanup);

  it("passes the selected file to the caller", async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<ImagePicker src="" onSelect={onSelect} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "shape.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(file));
    expect(input.value).toBe("");
  });

  it("shows preview and reports selection errors", async () => {
    const onSelect = vi.fn().mockRejectedValue(new Error("Image is too large"));
    const { container } = render(
      <ImagePicker src="data:image/png;base64,preview" onSelect={onSelect} />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    expect(screen.getByRole("img", { name: "Selected preview" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Replace Image" })).toBeDefined();

    fireEvent.change(input, {
      target: { files: [new File(["image"], "large.png", { type: "image/png" })] },
    });

    expect(await screen.findByText("Image is too large")).toBeDefined();
  });
});
