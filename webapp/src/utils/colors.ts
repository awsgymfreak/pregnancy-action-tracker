const PALETTE = [
  '#2563EB', // blue
  '#DC2626', // red
  '#16A34A', // green
  '#D97706', // amber
  '#7C3AED', // violet
  '#DB2777', // pink
  '#0891B2', // cyan
  '#65A30D', // lime
];

export function assignColors(actionTypeIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  actionTypeIds.forEach((id, index) => {
    map[id] = PALETTE[index % PALETTE.length];
  });
  return map;
}

export function getColorForActionType(actionTypeId: string, allActionTypeIds: string[]): string {
  const index = allActionTypeIds.indexOf(actionTypeId);
  if (index === -1) {
    return PALETTE[0];
  }
  return PALETTE[index % PALETTE.length];
}
