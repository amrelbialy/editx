import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchInput } from "./search-input.component";

afterEach(cleanup);

describe("SearchInput", () => {
  it("emits typed value via onValueChange", () => {
    const onValueChange = vi.fn();
    render(<SearchInput value="" onValueChange={onValueChange} ariaLabel="Search" />);

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "hi" } });
    expect(onValueChange).toHaveBeenCalledWith("hi");
  });

  it("hides the clear button when empty and shows it with a value", () => {
    const { rerender } = render(
      <SearchInput value="" onValueChange={vi.fn()} ariaLabel="Search" clearLabel="Clear" />,
    );
    expect(screen.queryByLabelText("Clear")).toBeNull();

    rerender(
      <SearchInput value="x" onValueChange={vi.fn()} ariaLabel="Search" clearLabel="Clear" />,
    );
    expect(screen.getByLabelText("Clear")).toBeDefined();
  });

  it("clears via onValueChange('') by default", () => {
    const onValueChange = vi.fn();
    render(
      <SearchInput value="x" onValueChange={onValueChange} ariaLabel="Search" clearLabel="Clear" />,
    );
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("prefers onClear when provided", () => {
    const onClear = vi.fn();
    const onValueChange = vi.fn();
    render(
      <SearchInput
        value="x"
        onValueChange={onValueChange}
        onClear={onClear}
        ariaLabel="Search"
        clearLabel="Clear"
      />,
    );
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
