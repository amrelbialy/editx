export function isValidPropertySelection(blockType: string | null): boolean {
  return (
    blockType === "text" ||
    blockType === "graphic" ||
    blockType === "image" ||
    blockType === "group"
  );
}
