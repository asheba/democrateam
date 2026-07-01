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
           password    TEXT NOT NULL DEFAULT ''
         )`,
      )
      .then(async () => {
        const info = await getClient().execute(`PRAGMA table_info(teams)`);
        const hasPassword = info.rows.some((r) => String(r['name']) === 'password');
        if (!hasPassword) {
          await getClient().execute(
            `ALTER TABLE teams ADD COLUMN password TEXT NOT NULL DEFAULT ''`,
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
}

export async function insertTeam(team: {
  uuid: string;
  voterName: string;
  voterImage: string | null;
  summary: string | null;
  selections: TeamSelection[];
  password: string;
}): Promise<void> {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO teams (uuid, voter_name, voter_image, summary, selections, created_at, password)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      team.uuid,
      team.voterName,
      team.voterImage,
      team.summary,
      JSON.stringify(team.selections),
      Date.now(),
      team.password,
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

export async function getTeamByPassword(password: string): Promise<Team | null> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT uuid, voter_name, voter_image, summary, selections, created_at
          FROM teams WHERE password = ? LIMIT 1`,
    args: [password],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    uuid: String(row['uuid']),
    voterName: String(row['voter_name']),
    voterImage: row['voter_image'] === null ? null : String(row['voter_image']),
    summary: row['summary'] === null ? null : String(row['summary']),
    selections: JSON.parse(String(row['selections'])) as TeamSelection[],
    createdAt: Number(row['created_at']),
  };
}

export async function getTeam(uuid: string): Promise<Team | null> {
  await ensureSchema();
  const result = await getClient().execute({
    sql: `SELECT uuid, voter_name, voter_image, summary, selections, created_at
          FROM teams WHERE uuid = ? LIMIT 1`,
    args: [uuid],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    uuid: String(row.uuid),
    voterName: String(row.voter_name),
    voterImage: row.voter_image === null ? null : String(row.voter_image),
    summary: row.summary === null ? null : String(row.summary),
    selections: JSON.parse(String(row.selections)) as TeamSelection[],
    createdAt: Number(row.created_at),
  };
}
