// 記録は常に JST の日時として扱う。端末の TZ が JST 以外でも同じ入力が同じ時刻になるよう、
// フォームの入力値には明示的に +09:00 を付けて UTC に変換する。
export function toJstIso(dateStr: string, timeStr: string): string | null {
  const d = new Date(`${dateStr}T${timeStr}:00+09:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Invalid Date を Prisma まで通すと 500 になるので、API 側で弾く
export function isValidDateString(v: unknown): v is string {
  return typeof v === "string" && !isNaN(new Date(v).getTime());
}

// "sv-SE" は YYYY-MM-DD 形式を返す
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export function nowTimeJst(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
