import { createClient, type Client } from '@libsql/client';

/**
 * libSQL client. In dev (no env vars) this is a local SQLite file so the whole
 * flow works end-to-end offline; in production set TURSO_DATABASE_URL and
 * TURSO_AUTH_TOKEN to point at Turso cloud — no code change required.
 */
let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient(authToken ? { url, authToken } : { url });
  }
  return client;
}

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getClient()
      .execute(
        `CREATE TABLE IF NOT EXISTS teams (
           uuid        TEXT PRIMARY KEY,
           voter_name  TEXT NOT NULL,
           voter_image TEXT,
           summary     TEXT,
           selections  TEXT NOT NULL,
           created_at  INTEGER NOT NULL,
           password    TEXT NOT NULL DEFAULT '',
           user_id     TEXT,
           verified    INTEGER NOT NULL DEFAULT 0
         )`,
      )
      .then(async () => {
        const info = await getClient().execute(`PRAGMA table_info(teams)`);
        const columns = new Set(info.rows.map((r) => String(r['name'])));
        if (!columns.has('password')) {
          await getClient().execute(
            `ALTER TABLE teams ADD COLUMN password TEXT NOT NULL DEFAULT ''`,
          );
        }
        if (!columns.has('user_id')) {
          await getClient().execute(`ALTER TABLE teams ADD COLUMN user_id TEXT`);
        }
        if (!columns.has('verified')) {
          await getClient().execute(
            `ALTER TABLE teams ADD COLUMN verified INTEGER NOT NULL DEFAULT 0`,
          );
        }
      });
  }
  return schemaReady;
}

export interface TeamSelection {
  candidateId: string;
  explanation: string;
}

export interface Team {
  uuid: string;
  voterName: string;
  voterImage: string | null;
  summary: string | null;
  selections: TeamSelection[];
  createdAt: number;
  verified: boolean;
}

export async function insertTeam(team: {
  uuid: string;
  voterName: string;
  voterImage: string | null;
  summary: string | null;
  selections: TeamSelection[];
  password: string;
  userId: string | null;
  verified: boolean;
}): Promise<void> {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO teams (uuid, voter_name, voter_image, summary, selections, created_at, password, user_id, verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      team.uuid,
      team.voterName,
      team.voterImage,
      team.summary,
      JSON.stringify(team.selections),
      Date.now(),
      team.password,
      team.userId,
      team.verified ? 1 : 0,
    ],
  });
}

export async function updateTeam(
  uuid: string,
  data: {
    voterName: string;
    voterImage: string | null;
    summary: string | null;
    selections: TeamSelection[];
  },
): Promise<boolean> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `UPDATE teams SET voter_name = ?, voter_image = ?, summary = ?, selections = ? WHERE uuid = ?`,
    args: [data.voterName, data.voterImage, data.summary, JSON.stringify(data.selections), uuid],
  });
  return (result.rowsAffected ?? 0) > 0;
}

/**
 * Reassign an anonymous team to a newly-authenticated user and mark it verified.
 * Guarded by `user_id IS NULL` so it only ever claims an unowned team.
 */
export async function claimTeam(
  uuid: string,
  userId: string,
  voterName: string,
  voterImage: string | null,
): Promise<boolean> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `UPDATE teams SET user_id = ?, verified = 1, password = '', voter_name = ?, voter_image = ?
          WHERE uuid = ? AND user_id IS NULL`,
    args: [userId, voterName, voterImage, uuid],
  });
  return (result.rowsAffected ?? 0) > 0;
}

function rowToTeam(row: Record<string, unknown>): Team {
  return {
    uuid: String(row['uuid']),
    voterName: String(row['voter_name']),
    voterImage: row['voter_image'] == null ? null : String(row['voter_image']),
    summary: row['summary'] == null ? null : String(row['summary']),
    selections: JSON.parse(String(row['selections'])) as TeamSelection[],
    createdAt: Number(row['created_at']),
    verified: Number(row['verified']) === 1,
  };
}

const SELECT_COLUMNS = `uuid, voter_name, voter_image, summary, selections, created_at, verified`;

export async function getTeamByPassword(password: string): Promise<Team | null> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM teams WHERE password = ? LIMIT 1`,
    args: [password],
  });
  const row = result.rows[0];
  return row ? rowToTeam(row as unknown as Record<string, unknown>) : null;
}

export async function getTeamByUserId(userId: string): Promise<Team | null> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM teams WHERE user_id = ? LIMIT 1`,
    args: [userId],
  });
  const row = result.rows[0];
  return row ? rowToTeam(row as unknown as Record<string, unknown>) : null;
}

export async function getTeam(uuid: string): Promise<Team | null> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT ${SELECT_COLUMNS} FROM teams WHERE uuid = ? LIMIT 1`,
    args: [uuid],
  });
  const row = result.rows[0];
  return row ? rowToTeam(row as unknown as Record<string, unknown>) : null;
}
