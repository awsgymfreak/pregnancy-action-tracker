export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateActionTypeName(name: string, existingNames: string[]): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Name is required.');
  }
  if (trimmed.length > 50) {
    throw new ValidationError('Name must be 50 characters or fewer.');
  }
  const lower = trimmed.toLowerCase();
  if (existingNames.some((n) => n.trim().toLowerCase() === lower)) {
    throw new ValidationError('An action type with this name already exists.');
  }
  return trimmed;
}

export function validateActionEventDates(startDate: string, endDate: string | null): void {
  if (!startDate || Number.isNaN(Date.parse(startDate))) {
    throw new ValidationError('Start time is required.');
  }
  if (endDate !== null) {
    if (Number.isNaN(Date.parse(endDate))) {
      throw new ValidationError('End time is invalid.');
    }
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      throw new ValidationError('End time must be after start time.');
    }
  }
}

export function validateDueDate(dueDate: string): void {
  if (!dueDate || Number.isNaN(Date.parse(dueDate))) {
    throw new ValidationError('A valid due date is required.');
  }
}
