"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusFilter = "active" | "blocked" | "all";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  profileId: string | null;
  isShadowbanned: boolean;
  isAdmin: boolean;
};

interface AdminUserManagerProps {
  initialUsers: AdminUser[];
  initialQuery: string;
  initialStatus: StatusFilter;
  currentUserId: string;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export function AdminUserManager({
  initialUsers,
  initialQuery,
  initialStatus,
  currentUserId,
}: AdminUserManagerProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const filteredCount = users.length;

  const emptyLabel = useMemo(() => {
    if (status === "blocked") {
      return "No blocked users found.";
    }
    if (status === "active") {
      return "No active users match your filters.";
    }
    return "No users found.";
  }, [status]);

  const matchesStatusFilter = (user: AdminUser, targetStatus: StatusFilter) => {
    if (targetStatus === "blocked") return user.isShadowbanned;
    if (targetStatus === "active") return !user.isShadowbanned;
    return true;
  };

  const buildQueryString = (query: string, nextStatus: StatusFilter) => {
    const params = new URLSearchParams();
    if (query.trim().length > 0) {
      params.set("query", query.trim());
    }
    if (nextStatus !== "active") {
      params.set("status", nextStatus);
    }
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const refreshPageWith = (query: string, nextStatus: StatusFilter) => {
    const queryString = buildQueryString(query, nextStatus);
    window.location.assign(`/admin/users${queryString}`);
  };

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatus(nextStatus);
    refreshPageWith(searchValue, nextStatus);
  };

  const handleSearchSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    refreshPageWith(searchValue, status);
  };

  const handleClearFilters = () => {
    setSearchValue("");
    setStatus("active");
    window.location.assign("/admin/users");
  };

  const handleToggleBlock = async (user: AdminUser, shouldBlock: boolean) => {
    setActionUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: shouldBlock ? "block" : "unblock" }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error ?? "Failed to update user");
      }

      const updated = payload.user as {
        id: string;
        email: string;
        createdAt: string;
        profile: { isShadowbanned: boolean };
      };

      setUsers((prev) =>
        prev
          .map((item) =>
            item.id === updated.id
              ? { ...item, isShadowbanned: updated.profile.isShadowbanned }
              : item
          )
          .filter((item) => matchesStatusFilter(item, status))
      );

      toast.success(`User ${shouldBlock ? "blocked" : "unblocked"}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Remove ${user.email}? This action cannot be undone.`)) {
      return;
    }

    setActionUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? "Failed to delete user");
      }

      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      toast.success("User removed");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-3xl border border-accent-cyan/30 bg-surface/70 p-4 backdrop-blur-sm lg:flex-row lg:items-center lg:gap-4"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Search by email or name
          </label>
          <Input
            name="query"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="player@example.com"
            className="h-11 rounded-2xl border border-accent-purple/30 bg-background/80 text-sm text-white"
          />
        </div>
        <input type="hidden" name="status" value={status} />
        <div className="flex flex-col gap-1 lg:w-48">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Status
          </label>
          <Select value={status} onValueChange={(value) => handleStatusChange(value as StatusFilter)}>
            <SelectTrigger className="h-11 rounded-2xl border border-accent-purple/30 bg-background/80 text-sm text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 pt-2 lg:flex-row lg:items-end lg:pt-6">
          <Button
            type="submit"
            className="h-11 rounded-2xl border border-accent-cyan/40 bg-accent-cyan/20 px-6 text-sm font-semibold text-accent-cyan hover:bg-accent-cyan/30"
          >
            Apply filters
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            className="h-11 rounded-2xl border border-transparent px-6 text-sm text-gray-400 hover:border-accent-purple/30 hover:bg-accent-purple/10 hover:text-white"
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
        <span>Showing {filteredCount} {filteredCount === 1 ? "user" : "users"}</span>
        <span>Blocking logs users out immediately.</span>
      </div>

      {users.length === 0 ? (
        <div className="rounded-3xl border border-accent-cyan/20 bg-surface/70 p-8 text-center text-sm text-gray-400">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isProcessing = actionUserId === user.id;
            const isBlocked = user.isShadowbanned;
            const isSelf = user.id === currentUserId;
            const isProtected = user.isAdmin || isSelf;

            return (
              <article
                key={user.id}
                className={cn(
                  "rounded-3xl border border-accent-cyan/20 bg-surface/80 p-5 shadow-glow transition hover:border-accent-cyan/40",
                  isBlocked && "border-rose-500/30"
                )}
              >
                <header className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white lg:text-lg">
                      {user.name}
                      {isBlocked && <Badge className="bg-rose-500/10 text-rose-200">Blocked</Badge>}
                      {user.isAdmin && <Badge className="bg-amber-500/10 text-amber-200">Admin</Badge>}
                      {isSelf && <Badge className="bg-accent-cyan/15 text-accent-cyan">You</Badge>}
                    </h2>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Joined {formatDate(user.createdAt)}
                  </p>
                </header>

                <footer className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => handleToggleBlock(user, !isBlocked)}
                    disabled={isProcessing || isProtected}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm",
                      isBlocked
                        ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                        : "border border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                    )}
                  >
                    {isBlocked ? "Unblock" : "Block"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(user)}
                    disabled={isProcessing || isProtected}
                    className="rounded-full bg-rose-500/80 px-4 py-2 text-sm text-white hover:bg-rose-500"
                  >
                    Remove
                  </Button>
                  {isProtected && (
                    <span className="text-xs text-gray-500">
                      {user.isAdmin
                        ? "Administrator accounts cannot be modified."
                        : "You cannot modify your own account."}
                    </span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
