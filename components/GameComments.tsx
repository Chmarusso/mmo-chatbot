"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface GameCommentsProps {
  gameValue: string;
  isLoggedIn: boolean;
}

export default function GameComments({ gameValue, isLoggedIn }: GameCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameValue}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameValue]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      toast.error("Please log in to comment");
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/${gameValue}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to post comment");
      }

      const comment = await response.json();
      setComments([comment, ...comments]);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const createdAt = new Date(isoDate).getTime();
    const diffMs = Date.now() - createdAt;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="text-accent-purple" size={24} />
        <h2 className="text-2xl font-semibold text-white">Comments</h2>
        <span className="text-sm text-text-secondary">({comments.length})</span>
      </div>

      {/* Comment Form */}
      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts about this game..."
            className="w-full resize-none rounded-2xl border border-accent-purple/20 bg-surface/80 px-4 py-3 text-sm text-white placeholder-text-secondary focus:border-accent-purple/40 focus:outline-none"
            rows={3}
            maxLength={1000}
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              {newComment.length}/1000
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="flex items-center gap-2 rounded-full bg-accent-purple px-5 py-2 text-sm font-medium text-white transition hover:bg-accent-purple/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-accent-purple/20 bg-surface/80 p-6 text-center">
          <p className="text-sm text-text-secondary">Log in to leave a comment</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-sm text-text-secondary">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-accent-purple/20 bg-surface/80 p-8 text-center">
            <p className="text-sm text-text-secondary">No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-accent-purple/20 bg-surface/80 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={comment.profile.avatarUrl || "/avatar-placeholder.svg"}
                    alt={comment.profile.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{comment.profile.name}</span>
                    <span className="text-xs text-text-secondary">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
