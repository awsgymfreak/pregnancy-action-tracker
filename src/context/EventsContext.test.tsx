import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { EventsProvider, useEvents } from './EventsContext';
import { ActionType } from '../models/types';

const FileSystem = require('expo-file-system');

function wrapper({ children }: { children: React.ReactNode }) {
  return <EventsProvider>{children}</EventsProvider>;
}

const instantType: ActionType = {
  id: 'type-instant',
  name: 'Baby movement',
  hasDuration: false,
  isDefault: true,
};

const durationType: ActionType = {
  id: 'type-duration',
  name: 'Contraction',
  hasDuration: true,
  isDefault: true,
};

describe('EventsContext', () => {
  afterEach(() => {
    FileSystem.__reset();
  });

  it('starts empty on first launch', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.events).toEqual([]);
  });

  it('adds an instant event without an end date', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.addEvent(
        { actionTypeId: instantType.id, startDate: '2026-08-23T10:00:00.000Z', endDate: null },
        instantType
      );
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].endDate).toBeNull();
  });

  it('rejects a duration event with no end date', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await expect(
      act(async () => {
        await result.current.addEvent(
          { actionTypeId: durationType.id, startDate: '2026-08-23T10:00:00.000Z', endDate: null },
          durationType
        );
      })
    ).rejects.toThrow('End time is required');
  });

  it('rejects an end date before the start date', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await expect(
      act(async () => {
        await result.current.addEvent(
          {
            actionTypeId: durationType.id,
            startDate: '2026-08-23T10:00:00.000Z',
            endDate: '2026-08-23T09:00:00.000Z',
          },
          durationType
        );
      })
    ).rejects.toThrow('End time must be after start time');
  });

  it('deletes an event', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      await result.current.addEvent(
        { actionTypeId: instantType.id, startDate: '2026-08-23T10:00:00.000Z', endDate: null },
        instantType
      );
    });
    const id = result.current.events[0].id;

    await act(async () => {
      await result.current.deleteEvent(id);
    });

    expect(result.current.events).toEqual([]);
  });

  it('rolls back in-memory state and surfaces an error when the write fails', async () => {
    const { result } = await renderHook(() => useEvents(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const originalWrite = FileSystem.writeAsStringAsync;
    FileSystem.writeAsStringAsync = jest.fn().mockRejectedValueOnce(new Error('disk full'));

    await expect(
      act(async () => {
        await result.current.addEvent(
          { actionTypeId: instantType.id, startDate: '2026-08-23T10:00:00.000Z', endDate: null },
          instantType
        );
      })
    ).rejects.toThrow("Couldn't save");

    expect(result.current.events).toEqual([]);

    FileSystem.writeAsStringAsync = originalWrite;
  });
});
