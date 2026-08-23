import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { SettingsProvider, useSettings } from './SettingsContext';

const FileSystem = require('expo-file-system');

function wrapper({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}

describe('SettingsContext', () => {
  afterEach(() => {
    FileSystem.__reset();
  });

  it('starts with no settings on first launch', async () => {
    const { result } = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toBeNull();
  });

  it('rejects an invalid due date', async () => {
    const { result } = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await expect(
      act(async () => {
        await result.current.updateDueDate('not-a-date');
      })
    ).rejects.toThrow();
  });

  it('sets and persists a valid due date', async () => {
    const { result } = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.updateDueDate('2026-12-01T00:00:00.000Z');
    });

    expect(result.current.settings?.dueDate).toBe('2026-12-01T00:00:00.000Z');
  });

  it('persists across a remount', async () => {
    const first = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(first.result.current.isLoaded).toBe(true));
    await act(async () => {
      await first.result.current.updateDueDate('2026-12-01T00:00:00.000Z');
    });

    const second = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(second.result.current.isLoaded).toBe(true));
    expect(second.result.current.settings?.dueDate).toBe('2026-12-01T00:00:00.000Z');
  });

  it('rolls back in-memory state and surfaces an error when the write fails', async () => {
    const { result } = await renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const originalWrite = FileSystem.writeAsStringAsync;
    FileSystem.writeAsStringAsync = jest.fn().mockRejectedValueOnce(new Error('disk full'));

    await expect(
      act(async () => {
        await result.current.updateDueDate('2026-12-01T00:00:00.000Z');
      })
    ).rejects.toThrow("Couldn't save");

    expect(result.current.settings).toBeNull();

    FileSystem.writeAsStringAsync = originalWrite;
  });
});
