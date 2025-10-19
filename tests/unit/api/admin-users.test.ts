import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();

const userFindUnique = vi.fn();
const userDelete = vi.fn();
const profileCreate = vi.fn();
const profileUpdate = vi.fn();
const sessionDeleteMany = vi.fn();
const otpTokenDeleteMany = vi.fn();

vi.mock("@/lib/session", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUnique,
      delete: userDelete,
    },
    profile: {
      create: profileCreate,
      update: profileUpdate,
    },
    session: {
      deleteMany: sessionDeleteMany,
    },
    otpToken: {
      deleteMany: otpTokenDeleteMany,
    },
  },
}));

const routes = await import("@/app/api/admin/users/[userId]/route");
const { PATCH: patchRoute, DELETE: deleteRoute } = routes;

const buildRequest = (method: string, body?: unknown) =>
  new Request("http://localhost/api/admin/users/target", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

const resetMocks = () => {
  getCurrentUser.mockReset();
  userFindUnique.mockReset();
  userDelete.mockReset();
  profileCreate.mockReset();
  profileUpdate.mockReset();
  sessionDeleteMany.mockReset();
  otpTokenDeleteMany.mockReset();
};

describe("admin user management API", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("rejects non-admin access", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", profile: { isAdmin: false } });

    const response = await patchRoute(buildRequest("PATCH", { action: "block" }), {
      params: { userId: "target" },
    });

    expect(response.status).toBe(403);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it("blocks a user and clears active sessions", async () => {
    getCurrentUser.mockResolvedValue({ id: "admin", profile: { isAdmin: true } });
    userFindUnique.mockResolvedValue({
      id: "target",
      email: "target@example.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      profile: {
        id: "profile-target",
        isShadowbanned: false,
        isAdmin: false,
        name: "Target",
      },
    });
    profileUpdate.mockResolvedValue({
      id: "profile-target",
      userId: "target",
      isShadowbanned: true,
      name: "Target",
      isAdmin: false,
    });
    sessionDeleteMany.mockResolvedValue({});
    otpTokenDeleteMany.mockResolvedValue({});

    const response = await patchRoute(buildRequest("PATCH", { action: "block" }), {
      params: { userId: "target" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      user: {
        id: "target",
        email: "target@example.com",
        profile: { isShadowbanned: true },
      },
    });
    expect(profileUpdate).toHaveBeenCalledWith({
      where: { id: "profile-target" },
      data: { isShadowbanned: true },
      select: expect.any(Object),
    });
    expect(sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(otpTokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "target" } });
    expect(profileCreate).not.toHaveBeenCalled();
  });

  it("deletes a user account", async () => {
    getCurrentUser.mockResolvedValue({ id: "admin", profile: { isAdmin: true } });
    userFindUnique.mockResolvedValue({
      id: "target",
      email: "target@example.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      profile: {
        id: "profile-target",
        isShadowbanned: false,
        isAdmin: false,
      },
    });
    userDelete.mockResolvedValue({});

    const response = await deleteRoute(buildRequest("DELETE"), {
      params: { userId: "target" },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(userDelete).toHaveBeenCalledWith({ where: { id: "target" } });
  });
});
