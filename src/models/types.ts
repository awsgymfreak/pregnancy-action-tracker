export interface ActionType {
  id: string;
  name: string;
  hasDuration: boolean;
  isDefault: boolean;
}

export interface ActionEvent {
  id: string;
  actionTypeId: string;
  startDate: string; // ISO 8601
  endDate: string | null; // ISO 8601, required when the action type has a duration
}

export interface Settings {
  dueDate: string; // ISO 8601
}

export interface ExportPayload {
  actionTypes: ActionType[];
  events: ActionEvent[];
  settings: Settings;
}
