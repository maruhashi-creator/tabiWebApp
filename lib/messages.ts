export const DEFAULT_CAT_NAME = "ねこ";

/** Messages store the cat as `{name}` so a cat literally named たび doesn't corrupt the text. */
export function withCatName(message: string, catName?: string | null) {
  return message.replaceAll("{name}", catName || DEFAULT_CAT_NAME);
}

export function catName(name?: string | null) {
  return name || DEFAULT_CAT_NAME;
}
