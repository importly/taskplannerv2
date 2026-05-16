export const LEVEL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000, 30000, 50000, 75000];

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getXpToNextLevel(xp: number): number {
  const currentLevel = getLevel(xp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return 0;
  }
  return LEVEL_THRESHOLDS[currentLevel] - xp;
}

export function getLevelProgress(xp: number): number {
  const currentLevel = getLevel(xp);
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return 100;
  }
  const currentLevelXp = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextLevelXp = LEVEL_THRESHOLDS[currentLevel];
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, progress));
}

export const ATTRIBUTE_COLORS: Record<string, string> = {
  Research: "#30D158",
  "ML/Math": "#FF9500",
  Systems: "#E1FF00",
  Algorithms: "#00E5FF",
  Engineering: "#BF5AF2",
  Communication: "#FF2D55",
};

export function getAttributeColor(attrName: string, tags?: { rpg_attribute: string, color_hex: string | null }[]): string {
  if (tags) {
    const tag = tags.find(t => t.rpg_attribute === attrName);
    if (tag?.color_hex) return tag.color_hex;
  }
  return ATTRIBUTE_COLORS[attrName] || "#8E8E93"; // Default gray fallback
}
