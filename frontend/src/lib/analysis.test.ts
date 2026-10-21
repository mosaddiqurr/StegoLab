// @vitest-environment node
import { describe, expect, it } from "vitest";
import { passwordStrength } from "./analysis";

describe("password strength hint", () => {
  it("grades by length and character variety", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("aaaaaaaa").label).toBe("Weak");
    expect(passwordStrength("hunter22").label).toBe("Weak");
    expect(passwordStrength("Correct-Horse-Battery-9").score).toBeGreaterThanOrEqual(3);
  });
});
