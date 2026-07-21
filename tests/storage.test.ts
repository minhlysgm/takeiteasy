import { describe, it, expect, beforeEach, vi } from "vitest";
import * as storage from "../lib/storage";

beforeEach(() => localStorage.clear());

describe("storage", () => {
  it("round-trips name", () => {
    expect(storage.getName()).toBeNull();
    storage.setName("Minh");
    expect(storage.getName()).toBe("Minh");
  });
  it("bestScore only increases", () => {
    storage.setBestScore(100);
    storage.setBestScore(40);
    expect(storage.getBestScore()).toBe(100);
  });
  it("completed accumulates unique ids", () => {
    storage.addCompleted("sep-hoi-task");
    storage.addCompleted("sep-hoi-task");
    expect(storage.getCompleted()).toEqual(["sep-hoi-task"]);
  });
  it("never throws when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => storage.setName("x")).not.toThrow();
    spy.mockRestore();
  });
});
