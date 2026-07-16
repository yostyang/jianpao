/** 卡路里 → 常见食物组合(趣味展示) */
const FOODS: { emoji: string; kcal: number }[] = [
  { emoji: '🍔', kcal: 550 },
  { emoji: '🍜', kcal: 470 },
  { emoji: '🧋', kcal: 350 },
  { emoji: '🍗', kcal: 250 },
  { emoji: '🍚', kcal: 230 },
  { emoji: '🥤', kcal: 200 },
  { emoji: '🍦', kcal: 180 },
  { emoji: '🍺', kcal: 150 },
];

/** 贪心凑出不超过 kcal 的 1~3 样食物,如「🍜🍦」 */
export function foodEquivalent(kcal: number): string {
  if (kcal < 100) return '';
  let remain = kcal;
  const picked: string[] = [];
  for (const f of FOODS) {
    while (picked.length < 3 && remain >= f.kcal * 0.85) {
      picked.push(f.emoji);
      remain -= f.kcal;
    }
    if (picked.length >= 3) break;
  }
  return picked.join('');
}
