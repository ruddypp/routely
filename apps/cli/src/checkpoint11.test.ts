import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildNotificationPayload,
  notificationAttemptToPublicDto,
  notificationChannelToPublicDto,
  normalizeNotificationChannelInput
} from "@routely/core";
import {
  createNotificationAttempt,
  initializeRoutely,
  listEnabledNotificationChannelsForEvent,
  listNotificationAttempts,
  upsertNotificationChannel,
  updateNotificationAttempt
} from "@routely/db";

describe("checkpoint 11 notifications", () => {
  it("normalizes narrow notification channels and redacts public targets", () => {
    const channel = normalizeNotificationChannelInput({
      type: "discord",
      name: "deploys",
      url: "https://discord.com/api/webhooks/123456/secret-token?token=abc",
      events: "deploy_failed,backup_failed"
    });

    expect(channel.events).toEqual(["deploy_failed", "backup_failed"]);
    const dto = notificationChannelToPublicDto({
      id: 1,
      ...channel,
      enabled: true,
      created_at: "2026-06-19T00:00:00.000Z",
      updated_at: "2026-06-19T00:00:00.000Z"
    });
    expect(dto.target).toContain("[redacted]");
    expect(dto.target).not.toContain("secret-token");
    expect(dto.target).not.toContain("abc");
  });

  it("builds provider-specific payloads", () => {
    const discord = buildNotificationPayload({ id: 1, name: "discord", type: "discord", enabled: true, events: ["deploy_failed"], config: { url: "https://discord.example/webhook" }, created_at: "", updated_at: "" }, "deploy_failed", { appName: "web", errorMessage: "build failed" });
    expect(discord.content).toContain("web");
    expect(Array.isArray(discord.embeds)).toBe(true);

    const telegram = buildNotificationPayload({ id: 2, name: "tg", type: "telegram", enabled: true, events: ["backup_failed"], config: { botToken: "123", chatId: "456" }, created_at: "", updated_at: "" }, "backup_failed", { databaseName: "postgres" });
    expect(telegram.chat_id).toBe("456");
    expect(telegram.text).toContain("postgres");
  });

  it("persists notification channels and delivery attempts", async () => {
    const root = await mkdtemp(join(tmpdir(), "routely-notifications-"));
    const { db } = initializeRoutely(root);
    const channel = upsertNotificationChannel(db, {
      type: "webhook",
      name: "generic",
      url: "https://hooks.example/routely",
      events: ["deploy_succeeded"]
    });
    expect(listEnabledNotificationChannelsForEvent(db, "deploy_succeeded")).toHaveLength(1);
    expect(listEnabledNotificationChannelsForEvent(db, "backup_failed")).toHaveLength(0);

    const attempt = createNotificationAttempt(db, { channelId: channel.id, event: "deploy_succeeded", resourceType: "deployment", resourceId: 7 });
    const finished = updateNotificationAttempt(db, attempt.id, { status: "succeeded", httpStatus: 204, message: "delivered", finishedAt: "2026-06-19T00:00:00.000Z" });
    expect(notificationAttemptToPublicDto(finished!).httpStatus).toBe(204);
    expect(listNotificationAttempts(db)[0].status).toBe("succeeded");
    db.close();
  });
});
