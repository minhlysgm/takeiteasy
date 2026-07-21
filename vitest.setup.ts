import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
});

Object.defineProperty(global, "localStorage", {
  value: dom.window.localStorage,
  writable: true,
});
