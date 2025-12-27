export const COLORS = [
  '#c0392b', // Red
  '#f1c40f', // Yellow
  '#9b59b6', // Purple
  '#00b386', // Green
  '#cc6600', // Orange
  '#0a4c8c', // Blue

  '#e74c3c', // Red
  '#f39c12', // Yellow
  '#8e44ad', // Purple
  '#27ae60', // Green
  '#d35400', // Orange
  '#2980b9' // Blue
] as const;

export function getUniqueColor(existingColors: string[]) {
  const colors = COLORS.filter((c) => !existingColors.includes(c));
  if (colors.length === 0) return getRandomColor();
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
