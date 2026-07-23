export interface CareItem {
  key: string;
  emoji: string;
  // default interval in days; items with a cycle are user-configurable in settings
  cycle?: number;
}

export interface CareGroup {
  label: string;
  items: CareItem[];
}

export const CARE_GROUPS: CareGroup[] = [
  {
    label: "日々のケア",
    items: [
      { key: "おもちゃ遊び", emoji: "🪀" },
      { key: "爪切り", emoji: "✂️" },
      { key: "歯磨き", emoji: "🦷" },
    ],
  },
  {
    label: "定期ケア",
    items: [
      { key: "ブラッシング", emoji: "🪮", cycle: 3 },
      { key: "シャンプー", emoji: "🛁", cycle: 30 },
      { key: "ノミ・ダニ予防", emoji: "🛡️", cycle: 30 },
      { key: "爪バリバリ交換", emoji: "📦", cycle: 30 },
    ],
  },
  {
    label: "環境メンテ",
    items: [
      { key: "猫砂掃除", emoji: "🧹", cycle: 25 },
      { key: "水交換", emoji: "💧", cycle: 7 },
      { key: "トイレシート交換", emoji: "📋", cycle: 4 },
    ],
  },
];

// Groups whose intervals can be changed in settings.
export const CONFIGURABLE_CARE_LABELS = ["定期ケア", "環境メンテ"];

export const CONFIGURABLE_CARE_GROUPS = CARE_GROUPS.filter((g) =>
  CONFIGURABLE_CARE_LABELS.includes(g.label)
);

export type CareCycles = Record<string, number>;

export const MIN_CARE_CYCLE = 1;
export const MAX_CARE_CYCLE = 365;

// Resolve an item's effective interval: a saved per-cat override wins over the default.
export function resolveCycle(item: CareItem, overrides?: CareCycles | null): number | undefined {
  const override = overrides?.[item.key];
  if (typeof override === "number" && override >= MIN_CARE_CYCLE && override <= MAX_CARE_CYCLE) {
    return override;
  }
  return item.cycle;
}
