import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { moderateComment } from "@/lib/comment-moderation";

const ORIGINAL_ENV = { ...process.env };

describe("moderateComment", () => {
  beforeEach(() => {
    Object.assign(process.env, ORIGINAL_ENV);
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.APP_URL = "http://localhost:3000";
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("skips moderation when API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);

    const result = await moderateComment("Hello world");

    expect(result.allowed).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("approves content when model returns allowed true", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"allowed": true}',
            },
          },
        ],
      }),
    })));

    const result = await moderateComment("Friendly raid advice");

    expect(result.allowed).toBe(true);
  });

  it("rejects content when flagged", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"allowed": false, "reasons": ["spam"]}',
            },
          },
        ],
      }),
    })));

    const result = await moderateComment("Buy gold at shady-site dot com");

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["spam"]);
  });

  it("defaults to allowed when response is malformed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "not-json",
            },
          },
        ],
      }),
    })));

    const result = await moderateComment("Edge case content");

    expect(result.allowed).toBe(true);
  });
});
