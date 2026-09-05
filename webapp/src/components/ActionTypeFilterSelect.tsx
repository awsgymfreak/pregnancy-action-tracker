import { useEffect, useRef, useState } from 'react';
import type { ActionType } from '../models/types';

interface ActionTypeFilterSelectProps {
  actionTypes: ActionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ActionTypeFilterSelect({
  actionTypes,
  selected,
  onChange,
}: ActionTypeFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const label =
    selected.length === 0
      ? 'All actions'
      : selected.length === 1
        ? (actionTypes.find((t) => t.id === selected[0])?.name ?? 'All actions')
        : `${selected.length} actions selected`;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="multiselect" ref={rootRef}>
      <button
        type="button"
        className="select-pill multiselect-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filter by action"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div className="multiselect-panel" role="listbox" aria-multiselectable="true">
          <label className="multiselect-option">
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
            All actions
          </label>
          <div className="multiselect-divider" />
          {actionTypes.map((type) => (
            <label key={type.id} className="multiselect-option">
              <input
                type="checkbox"
                checked={selected.includes(type.id)}
                onChange={() => toggle(type.id)}
              />
              {type.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
