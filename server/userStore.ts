import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AuditJob } from '../src/types.js';

export interface UserAccount {
  id: string;
  fullName: string;
  websiteName: string;
  websiteUrl: string;
  city: string;
  mobileNumber: string;
  email: string;
  profession: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface UserAuditRecord {
  id: string;
  userId: string;
  jobId: string;
  websiteName: string;
  url: string;
  domain: string;
  timestamp: number;
  status: 'completed' | 'failed';
  score: number;
  criticalIssues: number;
  warningIssues: number;
  noticeIssues: number;
  passedChecks: number;
  pagesCrawled: number;
  jobSnapshot?: AuditJob;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUDITS_FILE = path.join(DATA_DIR, 'audits.json');

class UserStore {
  private users: Map<string, UserAccount> = new Map(); // id -> user
  private sessions: Map<string, string> = new Map(); // token -> userId
  private userAudits: Map<string, UserAuditRecord[]> = new Map(); // userId -> records

  constructor() {
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create .data directory, running fully in-memory:', e);
    }
  }

  private loadData() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            this.users.set(u.id, u);
          }
        }
      }
    } catch (e) {
      console.warn('Error reading users file:', e);
    }

    try {
      if (fs.existsSync(AUDITS_FILE)) {
        const raw = fs.readFileSync(AUDITS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [userId, records] of Object.entries(parsed)) {
            if (Array.isArray(records)) {
              this.userAudits.set(userId, records as UserAuditRecord[]);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading audits file:', e);
    }
  }

  private persistUsers() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to persist users:', e);
    }
  }

  private persistAudits() {
    try {
      this.ensureDataDir();
      const obj: Record<string, UserAuditRecord[]> = {};
      for (const [userId, records] of this.userAudits.entries()) {
        obj[userId] = records;
      }
      fs.writeFileSync(AUDITS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to persist audits:', e);
    }
  }

  public hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  public register(data: {
    fullName: string;
    websiteName: string;
    websiteUrl: string;
    city: string;
    mobileNumber: string;
    email: string;
    profession: string;
    username: string;
    password: string;
  }): { success: boolean; user?: Omit<UserAccount, 'passwordHash' | 'salt'>; token?: string; error?: string } {
    const emailLower = data.email.trim().toLowerCase();
    const usernameLower = data.username.trim().toLowerCase();

    // Check duplicate email or username
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) {
        return { success: false, error: 'An account with this email address already exists. Please log in.' };
      }
      if (u.username.toLowerCase() === usernameLower) {
        return { success: false, error: 'This username is already taken. Please choose another one.' };
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(data.password, salt);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const newUser: UserAccount = {
      id: userId,
      fullName: data.fullName.trim(),
      websiteName: data.websiteName.trim(),
      websiteUrl: data.websiteUrl.trim(),
      city: data.city.trim(),
      mobileNumber: data.mobileNumber.trim(),
      email: emailLower,
      profession: data.profession.trim(),
      username: usernameLower,
      passwordHash,
      salt,
      createdAt: Date.now()
    };

    this.users.set(userId, newUser);
    this.persistUsers();

    // Generate session token
    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, userId);

    const { passwordHash: _, salt: __, ...safeUser } = newUser;
    return { success: true, user: safeUser, token };
  }

  public login(
    usernameOrEmail: string,
    password: string
  ): { success: boolean; user?: Omit<UserAccount, 'passwordHash' | 'salt'>; token?: string; error?: string } {
    const input = usernameOrEmail.trim().toLowerCase();

    let foundUser: UserAccount | undefined;
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === input || u.email.toLowerCase() === input) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return { success: false, error: 'Invalid username/email or password.' };
    }

    const checkHash = this.hashPassword(password, foundUser.salt);
    if (checkHash !== foundUser.passwordHash) {
      return { success: false, error: 'Invalid username/email or password.' };
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    this.sessions.set(token, foundUser.id);

    const { passwordHash: _, salt: __, ...safeUser } = foundUser;
    return { success: true, user: safeUser, token };
  }

  public getUserByToken(token: string): Omit<UserAccount, 'passwordHash' | 'salt'> | null {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const userId = this.sessions.get(cleanToken);
    if (!userId) return null;
    const u = this.users.get(userId);
    if (!u) return null;
    const { passwordHash: _, salt: __, ...safeUser } = u;
    return safeUser;
  }

  public logout(token: string): void {
    if (!token) return;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    this.sessions.delete(cleanToken);
  }

  public forgotPassword(usernameOrEmail: string): { success: boolean; message: string; tempResetToken?: string } {
    const input = usernameOrEmail.trim().toLowerCase();
    let foundUser: UserAccount | undefined;
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === input || u.email.toLowerCase() === input) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      // Return ambiguous message for security
      return {
        success: true,
        message: 'If an account matches this username/email, password reset instructions have been generated.'
      };
    }

    const resetToken = `rst_${crypto.randomBytes(16).toString('hex')}`;
    return {
      success: true,
      message: `Password reset link generated for ${foundUser.email}. You can reset your password now.`,
      tempResetToken: resetToken
    };
  }

  public resetPassword(usernameOrEmail: string, newPassword: string): { success: boolean; message: string } {
    const input = usernameOrEmail.trim().toLowerCase();
    let foundUser: UserAccount | undefined;
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === input || u.email.toLowerCase() === input) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return { success: false, message: 'Account not found.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    foundUser.salt = salt;
    foundUser.passwordHash = this.hashPassword(newPassword, salt);
    this.users.set(foundUser.id, foundUser);
    this.persistUsers();

    return { success: true, message: 'Password has been successfully updated.' };
  }

  // User's private audit records
  public getUserAudits(userId: string): UserAuditRecord[] {
    const list = this.userAudits.get(userId) || [];
    // Return sorted newest first
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }

  public addUserAudit(userId: string, audit: Omit<UserAuditRecord, 'id' | 'userId'>): UserAuditRecord {
    const list = this.userAudits.get(userId) || [];
    const newRecord: UserAuditRecord = {
      ...audit,
      id: `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId
    };

    // Prepend new record (keeping all previous audits intact)
    list.unshift(newRecord);
    // Keep up to 100 private history records per user
    if (list.length > 100) {
      list.pop();
    }
    this.userAudits.set(userId, list);
    this.persistAudits();
    return newRecord;
  }

  public getUserAuditById(userId: string, recordId: string): UserAuditRecord | undefined {
    const list = this.userAudits.get(userId) || [];
    return list.find(r => r.id === recordId || r.jobId === recordId);
  }
}

export const userStore = new UserStore();
