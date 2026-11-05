import { describe, expect, it } from "vitest";
import { arrowPath, splitSubpaths, stepPaths } from "@/lib/sketch/paths";

describe("arrowPath", () => {
  it("vẽ đường cong rồi đầu mũi tên quay về điểm cuối", () => {
    const d = arrowPath([0, 0, 10, 0, 20, 0, 30, 0]);
    expect(d.startsWith("M0,0 C")).toBe(true);
    expect(d).toContain("L30,0");
  });
});

describe("stepPaths", () => {
  it("path: tất định theo seed, khác đường gốc", () => {
    const step = { kind: "path", d: "M0,0 L100,0", tone: "line", seed: 7 } as const;
    const a = stepPaths(step);
    const b = stepPaths(step);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a).not.toEqual(["M0,0 L100,0"]);
  });

  it("path: không seed vẫn tất định", () => {
    const step = { kind: "path", d: "M0,0 L100,0", tone: "ink" } as const;
    expect(stepPaths(step)).toEqual(stepPaths(step));
  });

  it("plain: trả nguyên đường gốc", () => {
    expect(stepPaths({ kind: "path", d: "M1,1 l.5,.5", tone: "line", plain: true })).toEqual(["M1,1 l.5,.5"]);
  });

  it("ellipse: có ít nhất một nét", () => {
    const out = stepPaths({ kind: "ellipse", cx: 50, cy: 50, w: 40, h: 20, tone: "ink", seed: 3, multi: true });
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  it("làm tròn toạ độ (tránh lệch chữ số cuối giữa Node và trình duyệt gây hydration mismatch)", () => {
    const out = stepPaths({ kind: "ellipse", cx: 240, cy: 156, w: 138, h: 206, tone: "ink", seed: 21, rough: 1.2, multi: true });
    for (const d of out) expect(d).not.toMatch(/\d\.\d{3,}/);
  });

  it("arrow: trả đúng một đường", () => {
    const out = stepPaths({ kind: "arrow", points: [0, 0, 10, 0, 20, 0, 30, 0], tone: "ink" });
    expect(out).toHaveLength(1);
  });
});

describe("splitSubpaths", () => {
  it("một subpath thì giữ nguyên", () => {
    expect(splitSubpaths("M0,0 C1,1 2,2 3,3")).toEqual(["M0,0 C1,1 2,2 3,3"]);
  });

  it("tách ở mỗi M tuyệt đối, giữ nguyên chữ của từng đoạn", () => {
    expect(splitSubpaths("M1,1 L2,2 M3,3 L4,4 5,5")).toEqual(["M1,1 L2,2", "M3,3 L4,4 5,5"]);
  });

  it("đường plain như râu của đoạn 1 (M + l tương đối): mỗi nốt một đoạn", () => {
    expect(splitSubpaths("M229,115 l.5,.5 M234,118 l.5,.5 M240,119 l.5,.5")).toEqual([
      "M229,115 l.5,.5",
      "M234,118 l.5,.5",
      "M240,119 l.5,.5",
    ]);
  });

  it("m tương đối mở đoạn sau: đổi điểm đầu thành tuyệt đối, tính từ điểm hiện tại", () => {
    expect(splitSubpaths("M1,1 l2,2 m3,3 l1,1")).toEqual(["M1,1 l2,2", "M6,6 l1,1"]);
  });

  it("m đầu tiên của cả chuỗi vốn đã là tuyệt đối", () => {
    expect(splitSubpaths("m1,1 l2,2 m3,3 l1,1")).toEqual(["m1,1 l2,2", "M6,6 l1,1"]);
  });

  it("cặp số thừa sau m là l tương đối, phải giữ nghĩa đó khi đổi sang M", () => {
    expect(splitSubpaths("M1,1 L2,2 m1,1 2,2 1,0")).toEqual(["M1,1 L2,2", "M3,3 l2 2 1 0"]);
  });

  it.each([
    ["c tương đối", "M0,0 c1,1 2,2 3,3 m1,1 l1,1", "M4,4 l1,1"],
    ["c lặp ngầm", "M0,0 c1,1 2,2 3,3 1,1 2,2 3,3 m1,1 l1,1", "M7,7 l1,1"],
    ["H V tuyệt đối", "M0,0 H7 V8 m1,1 l1,1", "M8,9 l1,1"],
    ["h v tương đối", "M1,1 h4 v2 m1,1 l1,1", "M6,4 l1,1"],
    ["s q t", "M0,0 s1,1 2,2 q1,1 2,2 t1,1 m1,1 l1,1", "M6,6 l1,1"],
    ["cờ a viết liền", "M0,0 a5,5 0 0110,0 m1,1 l1,1", "M11,1 l1,1"],
    ["z đưa về đầu đoạn", "M2,2 l3,0 l0,3 z m1,1 l1,1", "M3,3 l1,1"],
    ["số mũ", "M1e1,0 l1e1,0 m1,1 l1,1", "M21,1 l1,1"],
  ])("theo dõi điểm hiện tại qua %s", (_name, d, second) => {
    expect(splitSubpaths(d)[1]).toBe(second);
  });

  it("lệnh vẽ ngay sau z cũng mở subpath mới (dash cũng tính lại ở đó)", () => {
    expect(splitSubpaths("M0,0 L1,0 L1,1 Z L5,5")).toEqual(["M0,0 L1,0 L1,1 Z", "M0,0 L5,5"]);
  });

  it("chuỗi rỗng → không có đoạn nào", () => {
    expect(splitSubpaths("")).toEqual([]);
  });

  it("nét roughjs: đoạn nào cũng mở bằng đúng một M tuyệt đối", () => {
    const [d] = stepPaths({ kind: "path", d: "M30,226 L80,226 L80,196 L130,196", tone: "line", seed: 51, rough: 0.7 });
    const subs = splitSubpaths(d);
    expect(subs).toHaveLength(3);
    for (const s of subs) expect(s.match(/[Mm]/g)).toEqual(["M"]);
    expect(subs.join(" ").replace(/\s+/g, "")).toBe(d.replace(/\s+/g, ""));
  });

  it("vòng khoanh multi: hai vòng thành hai đoạn", () => {
    const [d] = stepPaths({ kind: "ellipse", cx: 352, cy: 146, w: 232, h: 280, tone: "ink", seed: 64, rough: 1.2, multi: true });
    expect(splitSubpaths(d)).toHaveLength(2);
  });
});
