import { describe, expect, it, vi } from "vitest";
import { EngineNotifications } from "./engine-notifications";

describe("transaction notifications", () => {
  it("coalesces observers and drains rendering before host callbacks", () => {
    const notifications = new EngineNotifications();
    const calls: string[] = [];
    const observer = () => calls.push("observer");
    notifications.run(() => {
      notifications.enqueue(observer);
      notifications.enqueue(observer);
      notifications.render(() => calls.push("render"));
      expect(calls).toEqual([]);
    });
    expect(calls).toEqual(["render", "observer"]);
  });

  it("renders a reentrant operation before continuing pending observers", () => {
    const notifications = new EngineNotifications();
    const calls: string[] = [];
    notifications.run(() => {
      notifications.enqueue(() => {
        calls.push("selection");
        notifications.run(() => notifications.render(() => calls.push("undo render")));
      });
      notifications.enqueue(() => calls.push("page"));
      notifications.render(() => calls.push("initial render"));
    });
    expect(calls).toEqual(["initial render", "selection", "undo render", "page"]);
  });

  it("stops draining when an observer opens another batch", () => {
    const notifications = new EngineNotifications();
    const observer = vi.fn();
    notifications.run(() => {
      notifications.enqueue(() => notifications.begin());
      notifications.enqueue(observer);
    });
    expect(observer).not.toHaveBeenCalled();
    notifications.end();
    expect(observer).toHaveBeenCalledTimes(1);
  });

  it("surfaces observer errors without permanently locking the queue", () => {
    const notifications = new EngineNotifications();
    expect(() =>
      notifications.enqueue(() => {
        throw new Error("Host callback failed");
      }),
    ).toThrow("Host callback failed");
    const observer = vi.fn();
    notifications.enqueue(observer);
    expect(observer).toHaveBeenCalledTimes(1);
  });
});
