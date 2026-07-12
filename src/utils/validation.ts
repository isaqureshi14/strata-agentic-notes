/**
 * validation.ts — Centralized strict input schema validation.
 * Rejects invalid types, sizes, or formats immediately.
 */

export const validator = {
  /**
   * Validates authentication & registration payloads.
   */
  validateAuth(payload: any, isSignup: boolean = false): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid request payload structure.');
    }

    const { noteId, password, name } = payload;

    // Validate Note ID
    if (!noteId || typeof noteId !== 'string') {
      throw new Error('Note ID is required and must be a string.');
    }
    const noteIdTrim = noteId.trim();
    if (noteIdTrim.length < 3 || noteIdTrim.length > 30) {
      throw new Error('Note ID must be between 3 and 30 characters.');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(noteIdTrim)) {
      throw new Error('Note ID can only contain alphanumeric characters, hyphens, and underscores.');
    }

    // Validate Password
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required and must be a string.');
    }
    if (password.length < 8 || password.length > 100) {
      throw new Error('Password must be between 8 and 100 characters.');
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one letter and one number.');
    }

    // Validate Name (Signups only)
    if (isSignup) {
      if (!name || typeof name !== 'string') {
        throw new Error('Full Name is required and must be a string.');
      }
      const nameTrim = name.trim();
      if (nameTrim.length < 2 || nameTrim.length > 50) {
        throw new Error('Name must be between 2 and 50 characters.');
      }
    }
  },

  /**
   * Validates note title and body schema.
   */
  validateNote(payload: any): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid note payload.');
    }

    const { title, content, type } = payload;

    if (title !== undefined) {
      if (typeof title !== 'string') {
        throw new Error('Note title must be a string.');
      }
      if (title.trim().length > 100) {
        throw new Error('Note title cannot exceed 100 characters.');
      }
    }

    if (content !== undefined) {
      if (typeof content !== 'string') {
        throw new Error('Note content must be a string.');
      }
      if (content.length > 100000) {
        throw new Error('Note content size limit exceeded (max 100,000 characters).');
      }
    }

    if (type !== undefined) {
      const allowedTypes = ['text', 'spreadsheet', 'tracker', 'expense'];
      if (!allowedTypes.includes(type)) {
        throw new Error(`Invalid note type: ${type}`);
      }
    }
  },

  /**
   * Validates finance micro-app entries (ExpenseEditor & TrackerEditor).
   */
  validateFinance(payload: any): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid finance item payload.');
    }

    const { description, amount, type, category } = payload;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      throw new Error('Transaction description is required.');
    }
    if (description.length > 100) {
      throw new Error('Description cannot exceed 100 characters.');
    }

    if (amount === undefined || typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Transaction amount must be a valid number.');
    }
    if (amount <= 0 || amount > 10000000) {
      throw new Error('Transaction amount must be positive and within reasonable limits.');
    }

    if (type && !['income', 'expense'].includes(type)) {
      throw new Error('Transaction type must be either income or expense.');
    }

    if (category && (typeof category !== 'string' || category.length > 50)) {
      throw new Error('Invalid category input.');
    }
  },

  /**
   * Validates calendar event data.
   */
  validateCalendar(payload: any): void {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid calendar event payload.');
    }

    const { title, start, end } = payload;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Event title is required.');
    }
    if (title.length > 100) {
      throw new Error('Event title cannot exceed 100 characters.');
    }

    if (!start || typeof start !== 'string' || isNaN(Date.parse(start))) {
      throw new Error('Event start time must be a valid ISO Date string.');
    }

    if (end) {
      if (typeof end !== 'string' || isNaN(Date.parse(end))) {
        throw new Error('Event end time must be a valid ISO Date string.');
      }
      if (new Date(end) < new Date(start)) {
        throw new Error('Event end time cannot be earlier than start time.');
      }
    }
  }
};
