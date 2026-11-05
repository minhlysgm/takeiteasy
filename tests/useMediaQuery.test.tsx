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

  it("render lại không đăng ký lại listener (subscribe ổn định theo query)", () => {
    let adds = 0;
    const mql = {
      matches: false,
      addEventListener: () => void adds++,
      removeEventListener: () => {},
    };
    vi.stubGlobal("matchMedia", () => mql);
    function Host({ n }: { n: number }) {
      const on = useMediaQuery("(max-width: 700px)");
      return <output data-testid="on">{`${on}-${n}`}</output>;
    }
    const { rerender } = render(<Host n={0} />);
    rerender(<Host n={1} />);
    rerender(<Host n={2} />);
    expect(screen.getByTestId("on").textContent).toBe("false-2");
    expect(adds).toBe(1);
  });

  it("render lại không tạo MediaQueryList mới (một cái cho mỗi query)", () => {
    let calls = 0;
    const mql = { matches: false, addEventListener: () => {}, removeEventListener: () => {} };
    vi.stubGlobal("matchMedia", () => (calls++, mql));
    function Host({ n }: { n: number }) {
      const on = useMediaQuery("(max-width: 700px)");
      return <output data-testid="on">{`${on}-${n}`}</output>;
    }
    const { rerender } = render(<Host n={0} />);
    rerender(<Host n={1} />);
    rerender(<Host n={2} />);
    expect(calls).toBe(1);
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
