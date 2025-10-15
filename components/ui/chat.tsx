"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "sent" | "received";
}

export const ChatContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-surface/80",
      className,
    )}
    {...props}
  />
));
ChatContainer.displayName = "ChatContainer";

export const ChatHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between border-b border-border/40 px-6 py-4",
      className,
    )}
    {...props}
  />
));
ChatHeader.displayName = "ChatHeader";

export const ChatMessages = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ScrollArea>
>(({ className, ...props }, ref) => (
  <ScrollArea
    ref={ref as any}
    className={cn("flex-1 px-5 py-6 lg:px-8", className)}
    {...props}
  />
));
ChatMessages.displayName = "ChatMessages";

export const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, variant = "received", ...props }, ref) => (
    <div
      ref={ref}
      data-variant={variant}
      className={cn(
        "flex gap-3",
        variant === "sent" ? "justify-end text-right" : "justify-start text-left",
        className,
      )}
      {...props}
    />
  ),
);
ChatBubble.displayName = "ChatBubble";

export const ChatBubbleMessage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "sent" | "received" }
>(({ className, variant = "received", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex max-w-[78%] flex-col rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
      variant === "sent"
        ? "bg-accent-cyan/20 text-accent-cyan backdrop-blur"
        : "bg-background/85 text-foreground",
      className,
    )}
    {...props}
  />
));
ChatBubbleMessage.displayName = "ChatBubbleMessage";

export const ChatBubbleTimestamp = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "mt-1 block text-[10px] uppercase tracking-wide text-muted-foreground",
      className,
    )}
    {...props}
  />
));
ChatBubbleTimestamp.displayName = "ChatBubbleTimestamp";

interface ChatInputProps
  extends React.FormHTMLAttributes<HTMLFormElement> {
  isSubmitting?: boolean;
  actionLabel?: string;
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  renderActions?: () => React.ReactNode;
}

export const ChatInput = React.forwardRef<HTMLFormElement, ChatInputProps>(
  (
    {
      className,
      isSubmitting,
      actionLabel = "Send",
      textareaProps,
      renderActions,
      children,
      ...props
    },
    ref,
  ) => (
    <form
      ref={ref}
      className={cn(
        "border-t border-border/40 bg-background/80 px-4 py-4 lg:px-6",
        className,
      )}
      {...props}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        {children}
        <div className="flex items-center justify-end gap-3">
          {renderActions?.()}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-11 rounded-2xl bg-accent-cyan px-5 text-background hover:bg-accent-cyan/90"
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </form>
  ),
);
ChatInput.displayName = "ChatInput";
