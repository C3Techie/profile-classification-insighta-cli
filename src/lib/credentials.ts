import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Credentials {
  access_token: string;
  refresh_token: string;
  username: string;
  role: string;
  backend_url: string;
}

const CREDENTIALS_DIR = path.join(os.homedir(), '.insighta');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');

export function saveCredentials(creds: Credentials): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function loadCredentials(): Credentials | null {
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    fs.unlinkSync(CREDENTIALS_FILE);
  }
}

export function updateTokens(access_token: string, refresh_token: string): void {
  const creds = loadCredentials();
  if (!creds) return;
  creds.access_token = access_token;
  creds.refresh_token = refresh_token;
  saveCredentials(creds);
}
