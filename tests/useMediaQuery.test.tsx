import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/lib/useMediaQuery";

function Probe() {
  const on = useMediaQuery("(max-width: 700px)");
  return <output data-testid="on">{String(on)}</output>;
}

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("không có matchMedia → false", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Probe />);
    expect(screen.getByTestId("on").textContent).toBe("false");
  });

  it("đổi matches + phát change → hook cập nhật", () => {
    const listeners = new Set<() => void>();
    const mql = {
      matches: false,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    };
    vi.stubGlobal("matchMedia", () => mql);
    const { unmount } = render(<Probe />);
    expect(screen.getByTestId("on").textContent).toBe("false");
    act(() => {
      mql.matches = true;
      listeners.forEach((cb) => cb());
    });
    expect(screen.getByTestId("on").textContent).toBe("true");
    unmount();
    expect(listeners.size).toBe(0);
  });
});
