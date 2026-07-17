import { describe, expect, it } from "vitest";
import {
  defaultStudentAvatarId,
  normalizeStudentAvatarId,
  studentAvatarOptions,
} from "../../src/studentAvatars";

describe("student avatar options", () => {
  it("keeps every supported avatar id", () => {
    for (const option of studentAvatarOptions) {
      expect(normalizeStudentAvatarId(option.id)).toBe(option.id);
    }
  });

  it("falls back when an old or invalid avatar id is restored", () => {
    expect(normalizeStudentAvatarId()).toBe(defaultStudentAvatarId);
    expect(normalizeStudentAvatarId("removed-avatar")).toBe(defaultStudentAvatarId);
  });
});
