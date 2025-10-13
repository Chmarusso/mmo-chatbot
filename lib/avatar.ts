export const AVATAR_PLACEHOLDER = "/avatar-placeholder.svg";

const INVALID_AVATAR_VALUES = new Set(["null", "undefined", "about:blank"]);

export const resolveAvatarUrl = (avatarUrl?: string | null) => {
  if (!avatarUrl) {
    return AVATAR_PLACEHOLDER;
  }
  const trimmed = avatarUrl.trim();
  if (!trimmed) {
    return AVATAR_PLACEHOLDER;
  }
  if (INVALID_AVATAR_VALUES.has(trimmed.toLowerCase())) {
    return AVATAR_PLACEHOLDER;
  }
  return trimmed;
};

export const isPlaceholderAvatar = (avatarUrl?: string | null) => {
  if (!avatarUrl) return true;
  const trimmed = avatarUrl.trim();
  if (!trimmed) return true;
  return INVALID_AVATAR_VALUES.has(trimmed.toLowerCase());
};
