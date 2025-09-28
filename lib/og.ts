const COLORS = [
  ['#0ea5e9', '#6366f1'],
  ['#ec4899', '#8b5cf6'],
  ['#22c55e', '#0ea5e9'],
  ['#f97316', '#ef4444'],
  ['#14b8a6', '#8b5cf6'],
  ['#facc15', '#f97316'],
];

export function gradientFromString(seed: string) {
  const hash = Array.from(seed || 'og-default').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export function formatDateTime(value: Date) {
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
