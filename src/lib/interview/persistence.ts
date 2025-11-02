import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { InterviewState, PersistedState } from '../../types/interview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurable sessions directory for test isolation
// In tests, call setSessionsDir() before any operations
let sessionsDir = process.env.SESSIONS_DIR || join(__dirname, '../../../sessions');
const SESSION_EXTENSION = '.json';
const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Configure the sessions directory path.
 * This is primarily used for test isolation to redirect session I/O to temp directories.
 * @param dir - The directory path to use for session storage
 */
export async function setSessionsDir(dir: string): Promise<void> {
  sessionsDir = dir;
  await ensureSessionsDirectory();
}

async function ensureSessionsDirectory(): Promise<void> {
  try {
    await fs.access(sessionsDir);
  } catch {
    await fs.mkdir(sessionsDir, { recursive: true });
  }
}

function getSessionFilePath(sessionId: string): string {
  return join(sessionsDir, `${sessionId}${SESSION_EXTENSION}`);
}

function serializeState(state: InterviewState): string {
  const serializable = {
    ...state,
    responses: state.responses.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString()
    }))
  };
  return JSON.stringify(serializable, null, 2);
}

function deserializeState(json: string): InterviewState {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    responses: parsed.responses.map((r: any) => ({
      ...r,
      timestamp: new Date(r.timestamp)
    }))
  };
}

export async function saveSession(state: InterviewState): Promise<void> {
  await ensureSessionsDirectory();

  const persistedState: PersistedState = {
    sessionId: state.sessionId,
    timestamp: new Date(),
    interviewState: state,
    partialRequirements: state.requirements,
    conversationMetadata: state.conversationMetadata
  };

  const serialized = JSON.stringify(
    {
      ...persistedState,
      timestamp: persistedState.timestamp.toISOString(),
      interviewState: {
        ...persistedState.interviewState,
        responses: persistedState.interviewState.responses.map(r => ({
          ...r,
          timestamp: r.timestamp.toISOString()
        })),
        conversationMetadata: persistedState.interviewState.conversationMetadata
          ? {
              ...persistedState.interviewState.conversationMetadata,
              lastActivity: persistedState.interviewState.conversationMetadata.lastActivity.toISOString(),
              conversationStarted: persistedState.interviewState.conversationMetadata.conversationStarted.toISOString()
            }
          : undefined
      },
      conversationMetadata: persistedState.conversationMetadata
        ? {
            ...persistedState.conversationMetadata,
            lastActivity: persistedState.conversationMetadata.lastActivity.toISOString(),
            conversationStarted: persistedState.conversationMetadata.conversationStarted.toISOString()
          }
        : undefined
    },
    null,
    2
  );

  const filePath = getSessionFilePath(state.sessionId);
  await fs.writeFile(filePath, serialized, 'utf-8');
}

export async function loadSession(sessionId: string): Promise<InterviewState | null> {
  try {
    const filePath = getSessionFilePath(sessionId);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed: any = JSON.parse(content);

    const persistedState: PersistedState = {
      sessionId: parsed.sessionId,
      timestamp: new Date(parsed.timestamp),
      interviewState: {
        ...parsed.interviewState,
        responses: parsed.interviewState.responses.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        })),
        conversationMetadata: parsed.interviewState.conversationMetadata
          ? {
              ...parsed.interviewState.conversationMetadata,
              lastActivity: new Date(parsed.interviewState.conversationMetadata.lastActivity),
              conversationStarted: new Date(parsed.interviewState.conversationMetadata.conversationStarted)
            }
          : undefined
      },
      partialRequirements: parsed.partialRequirements,
      conversationMetadata: parsed.conversationMetadata
        ? {
            ...parsed.conversationMetadata,
            lastActivity: new Date(parsed.conversationMetadata.lastActivity),
            conversationStarted: new Date(parsed.conversationMetadata.conversationStarted)
          }
        : undefined
    };

    return persistedState.interviewState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listSessions(): Promise<Array<{ sessionId: string; timestamp: Date }>> {
  await ensureSessionsDirectory();

  try {
    const files = await fs.readdir(sessionsDir);
    const sessions: Array<{ sessionId: string; timestamp: Date }> = [];

    for (const file of files) {
      if (!file.endsWith(SESSION_EXTENSION)) {
        continue;
      }

      const sessionId = file.replace(SESSION_EXTENSION, '');
      const filePath = join(sessionsDir, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        sessions.push({
          sessionId,
          timestamp: new Date(parsed.timestamp)
        });
      } catch {
        // Skip corrupted files
        continue;
      }
    }

    return sessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const filePath = getSessionFilePath(sessionId);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function cleanupOldSessions(maxAgeMs: number = MAX_SESSION_AGE_MS): Promise<number> {
  const sessions = await listSessions();
  const now = Date.now();
  let deletedCount = 0;

  for (const session of sessions) {
    const age = now - session.timestamp.getTime();
    if (age > maxAgeMs) {
      const deleted = await deleteSession(session.sessionId);
      if (deleted) {
        deletedCount++;
      }
    }
  }

  return deletedCount;
}

// Ensure sessions directory exists on module load
ensureSessionsDirectory().catch((error) => {
  console.warn('Failed to create sessions directory:', error);
});
