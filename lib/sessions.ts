import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), 'data', 'sessions.json');

export interface PaymentSession {
  sessionId: string;
  buyerAddress: string;
  amount: string; // USDC amount in wei (6 decimals)
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  createdAt: number;
  expiresAt: number;
  txHash?: string;
  confirmedAt?: number;
}

// Ensure data directory and file exist
function ensureSessionFile() {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({}));
  }
}

// Read all sessions
function readSessions(): Record<string, PaymentSession> {
  ensureSessionFile();
  const data = fs.readFileSync(SESSION_FILE, 'utf-8');
  return JSON.parse(data);
}

// Write all sessions
function writeSessions(sessions: Record<string, PaymentSession>) {
  ensureSessionFile();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

// Create new session
export function createSession(buyerAddress: string): PaymentSession {
  const sessionId = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const session: PaymentSession = {
    sessionId,
    buyerAddress: buyerAddress.toLowerCase(),
    amount: '39000000', // 39 USDC (6 decimals)
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
  };
  
  const sessions = readSessions();
  sessions[sessionId] = session;
  writeSessions(sessions);
  
  return session;
}

// Get session
export function getSession(sessionId: string): PaymentSession | null {
  const sessions = readSessions();
  return sessions[sessionId] || null;
}

// Update session
export function updateSession(sessionId: string, updates: Partial<PaymentSession>): PaymentSession | null {
  const sessions = readSessions();
  const session = sessions[sessionId];
  
  if (!session) return null;
  
  const updated = { ...session, ...updates };
  sessions[sessionId] = updated;
  writeSessions(sessions);
  
  return updated;
}

// Check if session is expired
export function isSessionExpired(session: PaymentSession): boolean {
  return Date.now() > session.expiresAt;
}

// Clean up old sessions (older than 7 days)
export function cleanupOldSessions() {
  const sessions = readSessions();
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const cleaned = Object.fromEntries(
    Object.entries(sessions).filter(([_, session]) => session.createdAt > sevenDaysAgo)
  );
  
  writeSessions(cleaned);
}
