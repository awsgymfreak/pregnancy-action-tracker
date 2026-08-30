export interface ActionType {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface ActionEvent {
  id: string;
  actionTypeId: string;
  startDate: string; // ISO 8601
  endDate: string | null; // ISO 8601 — whether this event has an end time is decided per-event at logging time, not by the action type
}

export interface Settings {
  dueDate: string; // ISO 8601
}

export interface ExportPayload {
  actionTypes: ActionType[];
  events: ActionEvent[];
  settings: Settings;
}
