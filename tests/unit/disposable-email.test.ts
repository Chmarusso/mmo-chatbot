import { describe, expect, it } from "vitest";

import {
  DisposableEmailError,
  getDisposableDomainSet,
  isDisposableEmail,
} from "@/lib/disposable-email";

describe("disposable email detection", () => {
  it("flags known disposable provider", () => {
    expect(isDisposableEmail("player@mailinator.com")).toBe(true);
  });

  it("flags subdomains of disposable providers", () => {
    expect(isDisposableEmail("player@alias.mailinator.com")).toBe(true);
  });

  it("accepts regular email addresses", () => {
    expect(isDisposableEmail("player@example.com")).toBe(false);
  });

  it("throws the expected error type", () => {
    const error = new DisposableEmailError();
    expect(error.name).toBe("DisposableEmailError");
  });

  it("provides a populated domain set", () => {
    expect(getDisposableDomainSet().size).toBeGreaterThan(0);
  });
});

