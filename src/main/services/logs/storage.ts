import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const LOGS_DIR = 'logs';

export function getLogsPath(): string {
  return path.join(app.getPath('userData'), LOGS_DIR);
}

function getTodayLogFile(): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(getLogsPath(), `${dateStr}.log`);
}

export function initLogs(): void {
  const logsPath = getLogsPath();
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
}

export function appendLog(message: string): void {
  try {
    const logFile = getTodayLogFile();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

export function getLogs(lines: number = 100): string[] {
  try {
    const logFile = getTodayLogFile();
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf-8');
    const allLines = content.split('\n').filter(line => line.trim() !== '');
    
    // Return last N lines
    return allLines.slice(-lines);
  } catch (error) {
    console.error('Failed to read logs:', error);
    return [];
  }
}

export function clearLogs(): void {
  try {
    const logsPath = getLogsPath();
    
    if (fs.existsSync(logsPath)) {
      const files = fs.readdirSync(logsPath);
      for (const file of files) {
        fs.unlinkSync(path.join(logsPath, file));
      }
    }
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}