/**
 * api.ts — Client-Side Local Storage API Service for user profile and authentication.
 *
 * Implements a fully offline user management pipeline in localStorage.
 * No network requests to http://localhost:3001 are made.
 */

import { rateLimiter } from '../utils/rateLimiter';
import { validator } from '../utils/validation';
import { hashPassword } from '../utils/crypto';

export interface UserProfile {
  id: string;
  noteId: string;
  name: string;
  role: 'USER' | 'DEVELOPER';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isGuest?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogItem {
  id: number;
  eventType: string;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function getToken(): string | null {
  return localStorage.getItem('aura_auth_token');
}

export function setToken(token: string): void {
  localStorage.setItem('aura_auth_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('aura_auth_token');
}

// Local mock databases in localStorage
function getLocalUsers(): any[] {
  const usersJson = localStorage.getItem('notespace_local_users');
  return usersJson ? JSON.parse(usersJson) : [];
}

function saveLocalUsers(users: any[]): void {
  localStorage.setItem('notespace_local_users', JSON.stringify(users));
}

// Seed default user and developer accounts if they don't exist
const initialUsers = getLocalUsers();
const devExists = initialUsers.some(u => u.noteId && u.noteId.toLowerCase() === 'developer');
const userExists = initialUsers.some(u => u.noteId && u.noteId.toLowerCase() === 'user123');
let changed = false;
const now = new Date().toISOString();

if (!devExists) {
  initialUsers.push({
    id: 'default-developer-id',
    noteId: 'developer',
    name: 'Developer Admin',
    password: import.meta.env.VITE_DEV_PASSWORD_HASH || '',
    role: 'DEVELOPER',
    approvalStatus: 'APPROVED',
    isAnonymized: false,
    createdAt: now,
    updatedAt: now
  });
  changed = true;
}

if (!userExists) {
  initialUsers.push({
    id: 'default-user-id',
    noteId: 'user123',
    name: 'John Doe',
    password: import.meta.env.VITE_USER_PASSWORD_HASH || '',
    role: 'USER',
    approvalStatus: 'APPROVED',
    isAnonymized: false,
    createdAt: now,
    updatedAt: now
  });
  changed = true;
}

if (changed) {
  saveLocalUsers(initialUsers);
}

function getLocalAuditLogs(): any[] {
  const logsJson = localStorage.getItem('notespace_local_audit_logs');
  return logsJson ? JSON.parse(logsJson) : [];
}

function saveLocalAuditLogs(logs: any[]): void {
  localStorage.setItem('notespace_local_audit_logs', JSON.stringify(logs));
}

function writeOfflineAuditLog(userId: string, eventType: string, metadata: any = null): void {
  const logs = getLocalAuditLogs();
  const newLog = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId,
    eventType,
    metadata,
    ipAddress: '127.0.0.1 (Local Offline)',
    createdAt: new Date().toISOString()
  };
  logs.unshift(newLog);
  saveLocalAuditLogs(logs);
}

// ---------------------------------------------------------------------------
// Endpoints API wrapper
// ---------------------------------------------------------------------------
export const accountApi = {
  async register(payload: any): Promise<{ token: string; data: UserProfile }> {
    const rateCheck = rateLimiter.checkRequestRateLimit('public');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many registration requests. Please try again later.'
      };
    }

    // Strict Input Validation
    try {
      validator.validateAuth(payload, true);
    } catch (e: any) {
      throw {
        status: 400,
        error: 'VALIDATION_FAILED',
        message: e.message || 'Invalid input schema.'
      };
    }

    const { name, noteId, password, isGuestSignup } = payload;
    const users = getLocalUsers();

    // Check Note ID availability
    const noteIdExists = users.some(u => u.noteId.toLowerCase() === noteId.toLowerCase() && !u.isAnonymized);
    if (noteIdExists) {
      throw {
        status: 409,
        error: 'NOTEID_ALREADY_EXISTS',
        message: 'An account with this Note ID already exists.'
      };
    }

    const userId = 'user_' + Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    const approvalStatus = isGuestSignup ? 'APPROVED' : 'PENDING';

    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: userId,
      noteId,
      name,
      password: hashedPassword,
      role: 'USER',
      approvalStatus,
      isAnonymized: false,
      createdAt: now,
      updatedAt: now
    };

    users.push(newUser);
    saveLocalUsers(users);

    writeOfflineAuditLog(userId, 'REGISTER');

    if (isGuestSignup) {
      setToken(userId);
    }

    const profile: UserProfile = {
      id: userId,
      noteId,
      name,
      role: 'USER',
      approvalStatus,
      createdAt: now,
      updatedAt: now
    };

    return { token: isGuestSignup ? userId : '', data: profile };
  },

  async login(payload: any): Promise<{ token: string; data: UserProfile }> {
    // Strict Input Validation
    try {
      validator.validateAuth(payload, false);
    } catch (e: any) {
      throw {
        status: 400,
        error: 'VALIDATION_FAILED',
        message: e.message || 'Invalid input schema.'
      };
    }

    const { noteId, password } = payload;

    // Check Auth Rate Limit
    const rateCheck = rateLimiter.checkAuthRateLimit(noteId);
    if (!rateCheck.allowed) {
      const secondsLeft = Math.ceil(rateCheck.waitTimeMs / 1000);
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many failed login attempts. Please wait ${secondsLeft} seconds before trying again.`
      };
    }

    const users = getLocalUsers();
    const user = users.find(u => u.noteId.toLowerCase() === noteId.toLowerCase() && !u.isAnonymized);
    
    const hashedPassword = await hashPassword(password);
    if (!user || user.password !== hashedPassword) {
      const waitTime = rateLimiter.recordAuthFailure(noteId);
      const msg = waitTime > 0
        ? `Note ID or password is incorrect. Account locked for ${Math.ceil(waitTime / 1000)} seconds.`
        : 'Note ID or password is incorrect.';
      throw {
        status: 401,
        error: 'INVALID_CREDENTIALS',
        message: msg
      };
    }

    // Check Approval Status
    if (user.approvalStatus === 'PENDING') {
      throw {
        status: 403,
        error: 'PENDING_APPROVAL',
        message: 'Your registration is pending developer approval. Please check back later.'
      };
    } else if (user.approvalStatus === 'REJECTED') {
      throw {
        status: 403,
        error: 'REGISTRATION_REJECTED',
        message: 'Your registration request was rejected by a developer.'
      };
    }

    // Success - reset attempts
    rateLimiter.recordAuthSuccess(noteId);

    setToken(user.id);
    writeOfflineAuditLog(user.id, 'LOGIN');

    const profile: UserProfile = {
      id: user.id,
      noteId: user.noteId,
      name: user.name,
      role: user.role,
      approvalStatus: user.approvalStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return { token: user.id, data: profile };
  },

  async getProfile(): Promise<UserProfile> {
    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const users = getLocalUsers();
    const user = users.find(u => u.id === token && !u.isAnonymized);
    if (!user) {
      removeToken();
      throw { status: 404, error: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    return {
      id: user.id,
      noteId: user.noteId,
      name: user.name,
      role: user.role,
      approvalStatus: user.approvalStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },

  async updateProfile(payload: any): Promise<UserProfile> {
    const rateCheck = rateLimiter.checkRequestRateLimit('auth_action');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again.'
      };
    }

    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const users = getLocalUsers();
    const userIdx = users.findIndex(u => u.id === token && !u.isAnonymized);
    if (userIdx === -1) {
      throw { status: 404, error: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    const fieldsChanged: string[] = [];
    if (payload.name && payload.name !== users[userIdx].name) {
      users[userIdx].name = payload.name;
      fieldsChanged.push('name');
    }
    if (payload.noteId && payload.noteId !== users[userIdx].noteId) {
      // Validate noteId availability if updated
      const noteIdExists = users.some(u => u.noteId.toLowerCase() === payload.noteId.toLowerCase() && u.id !== token && !u.isAnonymized);
      if (noteIdExists) {
        throw {
          status: 409,
          error: 'NOTEID_ALREADY_EXISTS',
          message: 'An account with this Note ID already exists.'
        };
      }
      users[userIdx].noteId = payload.noteId;
      fieldsChanged.push('noteId');
    }

    users[userIdx].updatedAt = new Date().toISOString();
    saveLocalUsers(users);

    writeOfflineAuditLog(token, 'PROFILE_UPDATE', { fields_changed: fieldsChanged });

    const user = users[userIdx];
    return {
      id: user.id,
      noteId: user.noteId,
      name: user.name,
      role: user.role,
      approvalStatus: user.approvalStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  },

  async changePassword(payload: any): Promise<void> {
    const rateCheck = rateLimiter.checkRequestRateLimit('auth_action');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many password change attempts. Please try again later.'
      };
    }

    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const { currentPassword, newPassword } = payload;
    const users = getLocalUsers();
    const userIdx = users.findIndex(u => u.id === token && !u.isAnonymized);
    if (userIdx === -1) {
      throw { status: 404, error: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    if (users[userIdx].password !== currentPassword) {
      throw {
        status: 401,
        error: 'INVALID_CURRENT_PASSWORD',
        message: 'The current password you entered is incorrect.'
      };
    }

    users[userIdx].password = newPassword;
    users[userIdx].updatedAt = new Date().toISOString();
    saveLocalUsers(users);

    writeOfflineAuditLog(token, 'PASSWORD_CHANGE');
    removeToken();
  },

  async exportData(): Promise<any> {
    const rateCheck = rateLimiter.checkRequestRateLimit('auth_action');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many export requests. Please slow down.'
      };
    }

    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const users = getLocalUsers();
    const user = users.find(u => u.id === token && !u.isAnonymized);
    if (!user) {
      throw { status: 404, error: 'USER_NOT_FOUND', message: 'User profile not found.' };
    }

    // Export user details, audit logs, and notes associated with this user
    const userLogs = getLocalAuditLogs().filter(log => log.userId === token);
    const notesJson = localStorage.getItem('notespace_notes') || '[]';
    const allNotes = JSON.parse(notesJson);
    const userNotes = allNotes.filter((n: any) => n.userId === token || !n.userId);

    const exportPackage = {
      profile: {
        id: user.id,
        noteId: user.noteId,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      auditLogs: userLogs.map(l => ({
        eventType: l.eventType,
        metadata: l.metadata,
        createdAt: l.createdAt
      })),
      notes: userNotes,
      exportedAt: new Date().toISOString()
    };

    writeOfflineAuditLog(token, 'DATA_EXPORT');
    return exportPackage;
  },

  async deleteAccount(): Promise<void> {
    const rateCheck = rateLimiter.checkRequestRateLimit('auth_action');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many delete requests.'
      };
    }

    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const users = getLocalUsers();
    const userIdx = users.findIndex(u => u.id === token && !u.isAnonymized);
    if (userIdx !== -1) {
      users[userIdx].name = '[ANONYMISED]';
      users[userIdx].noteId = 'anonymised-' + token + '@notespace.local';
      users[userIdx].password = 'DEACTIVATED_' + Math.random();
      users[userIdx].isAnonymized = true;
      users[userIdx].updatedAt = new Date().toISOString();
      saveLocalUsers(users);
    }

    writeOfflineAuditLog(token, 'ACCOUNT_DELETE');
    removeToken();
  },

  async getAuditLog(): Promise<AuditLogItem[]> {
    const token = getToken();
    if (!token) {
      throw { status: 401, error: 'UNAUTHORIZED', message: 'No token found' };
    }

    const logs = getLocalAuditLogs();
    const userLogs = logs.filter(log => log.userId === token);

    return userLogs.map(l => ({
      id: l.id,
      eventType: l.eventType,
      metadata: l.metadata,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt
    }));
  },

  // Mock admin functions to satisfy interface constraints
  async forgotPassword(email: string): Promise<void> {
    console.log('Forgot password called locally for:', email);
  },

  async getPendingSignups(): Promise<UserProfile[]> {
    const users = getLocalUsers();
    const pendings = users.filter(u => u.role === 'USER' && u.approvalStatus === 'PENDING' && !u.isAnonymized);
    return pendings.map(u => ({
      id: u.id,
      noteId: u.noteId,
      name: u.name,
      role: u.role,
      approvalStatus: u.approvalStatus,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
  },

  async getPendingResets(): Promise<any[]> {
    return [];
  },

  async approveSignup(userId: string): Promise<void> {
    const users = getLocalUsers();
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      users[userIdx].approvalStatus = 'APPROVED';
      users[userIdx].updatedAt = new Date().toISOString();
      saveLocalUsers(users);
      writeOfflineAuditLog(userId, 'DEVELOPER_APPROVE');
    }
  },

  async rejectSignup(userId: string): Promise<void> {
    const users = getLocalUsers();
    const userIdx = users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      users[userIdx].approvalStatus = 'REJECTED';
      users[userIdx].updatedAt = new Date().toISOString();
      saveLocalUsers(users);
      writeOfflineAuditLog(userId, 'DEVELOPER_REJECT');
    }
  },

  async approveReset(_requestId: string): Promise<string> {
    return 'MockTempPassword123!';
  },

  async rejectReset(requestId: string): Promise<void> {
    console.log('Reject reset called locally for:', requestId);
  },

  async submitFeedback(payload: { rating: number; comment: string; userId: string; userNoteId: string; userName: string; tag: string }): Promise<void> {
    const rateCheck = rateLimiter.checkRequestRateLimit('public');
    if (!rateCheck.allowed) {
      throw {
        status: 429,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many feedback requests. Please wait a bit.'
      };
    }

    const feedbackJson = localStorage.getItem('notespace_local_feedback');
    const list = feedbackJson ? JSON.parse(feedbackJson) : [];
    const newFeedback = {
      id: 'fb_' + Math.random().toString(36).substring(2, 15),
      ...payload,
      createdAt: new Date().toISOString()
    };
    list.unshift(newFeedback);
    localStorage.setItem('notespace_local_feedback', JSON.stringify(list));
  },

  async getFeedbackList(): Promise<any[]> {
    const feedbackJson = localStorage.getItem('notespace_local_feedback');
    return feedbackJson ? JSON.parse(feedbackJson) : [];
  },

  removeToken(): void {
    removeToken();
  },
};
