import { describe, expect, it } from "vitest";

import { formatBytes, shortPath } from "@/utils/format";

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(undefined)).toBe("-");
    expect(formatBytes(10)).toBe("10 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("shortPath", () => {
  it("keeps short path", () => {
    expect(shortPath("a/b/c")).toBe("a/b/c");
  });

  it("shortens long path", () => {
    expect(shortPath("a/b/c/d/e")).toBe("a/…/d/e");
  });
});

