import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { ActionTypesProvider, useActionTypes } from './ActionTypesContext';

const FileSystem = require('expo-file-system');

function wrapper({ children }: { children: React.ReactNode }) {
  return <ActionTypesProvider>{children}</ActionTypesProvider>;
}

describe('ActionTypesContext', () => {
  afterEach(() => {
    FileSystem.__reset();
  });

  it('seeds two default action types on first launch', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.actionTypes).toHaveLength(2);
    expect(result.current.actionTypes.map((a) => a.name)).toEqual(
      expect.arrayContaining(['Baby movement', 'Contraction'])
    );
    expect(result.current.actionTypes.every((a) => a.isDefault)).toBe(true);
  });

  it('adds a new action type and persists it', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.addActionType('Headache', false);
    });

    expect(result.current.actionTypes.map((a) => a.name)).toContain('Headache');
  });

  it('rejects a duplicate name case-insensitively', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await expect(
      act(async () => {
        await result.current.addActionType('baby movement', false);
      })
    ).rejects.toThrow('already exists');
  });

  it('updates an action type name', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const target = result.current.actionTypes[0];

    await act(async () => {
      await result.current.updateActionType(target.id, { name: 'Renamed' });
    });

    expect(result.current.actionTypes.find((a) => a.id === target.id)?.name).toBe('Renamed');
  });

  it('deletes an action type', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const idToDelete = result.current.actionTypes[0].id;

    await act(async () => {
      await result.current.deleteActionType(idToDelete);
    });

    expect(result.current.actionTypes.find((a) => a.id === idToDelete)).toBeUndefined();
  });

  it('persists across a remount (round-trip through the file store)', async () => {
    const first = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(first.result.current.isLoaded).toBe(true));
    await act(async () => {
      await first.result.current.addActionType('Headache', false);
    });

    const second = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(second.result.current.isLoaded).toBe(true));
    expect(second.result.current.actionTypes.map((a) => a.name)).toContain('Headache');
  });

  it('rolls back in-memory state and surfaces an error when the write fails', async () => {
    const { result } = await renderHook(() => useActionTypes(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const before = result.current.actionTypes;

    const originalWrite = FileSystem.writeAsStringAsync;
    FileSystem.writeAsStringAsync = jest.fn().mockRejectedValueOnce(new Error('disk full'));

    await expect(
      act(async () => {
        await result.current.addActionType('Headache', false);
      })
    ).rejects.toThrow("Couldn't save");

    expect(result.current.actionTypes).toEqual(before);

    FileSystem.writeAsStringAsync = originalWrite;
  });
});
