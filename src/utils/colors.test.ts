import { assignColors, getColorForActionType } from './colors';

describe('assignColors', () => {
  it('assigns a color to every id', () => {
    const result = assignColors(['a', 'b', 'c']);
    expect(Object.keys(result)).toEqual(['a', 'b', 'c']);
    expect(result.a).toBeTruthy();
  });

  it('is deterministic for the same input', () => {
    const first = assignColors(['a', 'b', 'c']);
    const second = assignColors(['a', 'b', 'c']);
    expect(first).toEqual(second);
  });

  it('gives different ids different colors when within the palette size', () => {
    const result = assignColors(['a', 'b', 'c']);
    const colors = Object.values(result);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('getColorForActionType', () => {
  it('matches the color assignColors would give the same list', () => {
    const ids = ['a', 'b', 'c'];
    const map = assignColors(ids);
    expect(getColorForActionType('b', ids)).toBe(map.b);
  });

  it('falls back to a default color for an unknown id', () => {
    expect(getColorForActionType('unknown', ['a', 'b'])).toBeTruthy();
  });
});
