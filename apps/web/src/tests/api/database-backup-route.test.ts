import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as GET_DATABASES, POST as POST_DATABASE } from "../../app/api/databases/route";
import { POST as START_DATABASE } from "../../app/api/databases/[id]/start/route";
import { GET as GET_BACKUPS, POST as POST_BACKUP } from "../../app/api/backups/route";
import { POST as RUN_BACKUP } from "../../app/api/backups/[id]/run/route";

const database = {
  id: 3,
  appId: 9,
  appName: "postgres",
  name: "postgres",
  type: "postgres",
  status: "stopped",
  internal: true,
  image: "postgres:16",
  port: 5432,
  composeService: "postgres",
  composeFile: null,
  volumeName: "postgres_data",
  envKeys: ["POSTGRES_DB"],
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

const backupJob = {
  id: 4,
  databaseId: 3,
  databaseName: "postgres",
  databaseType: "postgres",
  enabled: true,
  schedule: "0 2 * * *",
  retentionDays: 7,
  localDir: null,
  lastRunStatus: null,
  lastRunAt: null,
  lastRunMessage: null,
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

const backupRun = {
  id: 5,
  backupJobId: 4,
  databaseId: 3,
  databaseName: "postgres",
  databaseType: "postgres",
  status: "succeeded",
  trigger: "manual",
  filePath: "/var/lib/routely/backups/postgres.sql",
  sizeBytes: 128,
  message: "backup completed",
  startedAt: "2026-06-18T00:00:00.000Z",
  finishedAt: "2026-06-18T00:00:01.000Z",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:01.000Z"
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("database and backup route handlers", () => {
  it("proxies database list and create requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ databases: [database] }), { status: 200, headers: { "content-type": "application/json" } })
    ).mockResolvedValueOnce(
      new Response(JSON.stringify({ database, app: { id: 9, name: "postgres" } }), { status: 201, headers: { "content-type": "application/json" } })
    );

    const listResponse = await GET_DATABASES(new Request("http://localhost/api/databases"));
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).databases[0].internal).toBe(true);

    const createResponse = await POST_DATABASE(new Request("http://localhost/api/databases", { method: "POST", body: JSON.stringify({ type: "postgres", name: "postgres" }) }));
    expect(createResponse.status).toBe(201);
    expect(fetchMock).toHaveBeenLastCalledWith("http://127.0.0.1:9977/databases", expect.objectContaining({ method: "POST" }));
  });

  it("proxies database start requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ database: { ...database, status: "running" } }), { status: 200, headers: { "content-type": "application/json" } })
    );

    const response = await START_DATABASE(new Request("http://localhost/api/databases/3/start", { method: "POST" }), { params: Promise.resolve({ id: "3" }) });
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:9977/databases/3/start", expect.objectContaining({ method: "POST" }));
  });

  it("proxies backup list, enable, and manual run requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ jobs: [backupJob], runs: [backupRun], job: backupJob, run: backupRun }), { status: 200, headers: { "content-type": "application/json" } })
    );

    expect((await GET_BACKUPS(new Request("http://localhost/api/backups"))).status).toBe(200);
    expect((await POST_BACKUP(new Request("http://localhost/api/backups", { method: "POST", body: JSON.stringify({ databaseId: 3 }) }))).status).toBe(200);
    expect((await RUN_BACKUP(new Request("http://localhost/api/backups/4/run", { method: "POST", body: JSON.stringify({ trigger: "manual" }) }), { params: Promise.resolve({ id: "4" }) })).status).toBe(200);
    expect(fetchMock).toHaveBeenLastCalledWith("http://127.0.0.1:9977/backups/4/run", expect.objectContaining({ method: "POST" }));
  });
});
