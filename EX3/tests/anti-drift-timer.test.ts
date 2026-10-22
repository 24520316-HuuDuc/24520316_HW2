import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createAntiDriftTimer } from "../src/anti-drift-timer";

describe("Anti-drift countdown timer", () => {
  let currentTime: number;
  let nextFrameId: number;
  let frames: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    currentTime = 1000;
    nextFrameId = 0;
    frames = new Map();

    vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    vi.stubGlobal(
      "requestAnimationFrame",
      (callback: FrameRequestCallback) => {
        const id = ++nextFrameId;
        frames.set(id, callback);
        return id;
      }
    );

    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function runNextFrame() {
    const entry = frames.entries().next().value;

    if (!entry) {
      throw new Error("Không có frame nào đang chờ");
    }

    const [id, callback] = entry;
    frames.delete(id);
    callback(currentTime);
  }

  it("calculates remaining time from Date.now()", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    createAntiDriftTimer(1000, onTick, onComplete);

    expect(onTick).toHaveBeenLastCalledWith(1000);

    currentTime = 1400;
    runNextFrame();
    expect(onTick).toHaveBeenLastCalledWith(600);

    // Giả lập trình duyệt bị chậm một lúc.
    currentTime = 2500;
    runNextFrame();

    expect(onTick).toHaveBeenLastCalledWith(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it("completes immediately when duration is zero", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    createAntiDriftTimer(0, onTick, onComplete);

    expect(onTick).toHaveBeenCalledWith(0);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it("can cancel the countdown", () => {
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const cancel = createAntiDriftTimer(5000, onTick, onComplete);

    expect(frames.size).toBe(1);

    cancel();

    expect(frames.size).toBe(0);

    currentTime = 10000;
    expect(onComplete).not.toHaveBeenCalled();
  });
});
