import { readJsonFile, writeJsonFile } from './fileStorage';

const FileSystem = require('expo-file-system');

describe('fileStorage', () => {
  afterEach(() => {
    FileSystem.__reset();
  });

  it('returns null when the file does not exist', async () => {
    const result = await readJsonFile('missing.json');
    expect(result).toBeNull();
  });

  it('round-trips data written and then read', async () => {
    await writeJsonFile('test.json', { hello: 'world' });
    const result = await readJsonFile<{ hello: string }>('test.json');
    expect(result).toEqual({ hello: 'world' });
  });

  it('overwrites existing data on a second write', async () => {
    await writeJsonFile('test.json', { count: 1 });
    await writeJsonFile('test.json', { count: 2 });
    const result = await readJsonFile<{ count: number }>('test.json');
    expect(result).toEqual({ count: 2 });
  });
});
