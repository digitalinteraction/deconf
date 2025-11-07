import { SqlDependency } from "gruber";
import { useAppConfig, useDatabase, useStore } from "../lib/globals.ts";
import { WebPushPayload, WebPushRepo } from "./web-push-repo.ts";
import {
  ConferenceTable,
  RegistrationTable,
  SessionSaveTable,
  SessionTable,
  WebPushDeviceTable,
  WebPushMessageTable,
} from "../lib/tables.ts";
import { getConferenceInfo, getSessionUrl } from "../lib/utilities.ts";
import { AppConfig } from "../config.ts";

//
// A context to run various sub-commands with containing relevant dependencies & helpers
//
class NotifyContext {
  options: NotifyOptions;
  webPush: WebPushRepo;
  sql: SqlDependency;
  appConfig: AppConfig;
  date: Date;
  constructor(
    options: NotifyOptions,
    webPush: WebPushRepo,
    sql: SqlDependency,
    appConfig: AppConfig,
    date: Date,
  ) {
    this.options = options;
    this.webPush = webPush;
    this.sql = sql;
    this.appConfig = appConfig;
    this.date = date;
  }

  /** Log a timestamped message */
  log(message: string, ...args: any[]) {
    console.error(new Date().toISOString() + " " + message, ...args);
  }

  /** Wait for a duration to elapse (milliseconds) */
  pause(ms: number) {
    this.log("pause ms=%o", ms);
    return new Promise((r) => setTimeout(r, ms));
  }
}

export interface NotifyOptions {
  dryRun: boolean;
  forever: boolean;
  interval: number;
  grace: number;
  date?: string;
}

export async function notifyCommand(options: NotifyOptions) {
  // Parse the date from options or use "now"
  const date = options.date ? new Date(options.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("invalid date option");

  // Set up context
  const appConfig = useAppConfig();
  const store = useStore();
  const sql = useDatabase();
  const webPush = WebPushRepo.use();
  const ctx = new NotifyContext(options, webPush, sql, appConfig, date);

  ctx.log("init date=", date.toISOString());

  try {
    do {
      ctx.log("starting");

      await enqueueMySchedule(ctx);
      await sendPendingMessages(ctx);

      if (options.forever) await ctx.pause(options.interval);
    } while (options.forever);

    ctx.log("done");
  } catch (error) {
    console.log("Fatal error", error);
  }

  await store.close();
  await sql.end();
}

interface PendingMessage {
  deviceId: number;
  saveId: number;
  payload: WebPushPayload;
}

async function enqueueMySchedule(ctx: NotifyContext) {
  ctx.log("enqueue from schedule…");

  // Get sessions starting in 15 minutes or started 5 minutes ago
  const upcoming = await SessionTable.select(
    ctx.sql,
    ctx.sql`
      start_date IS NOT NULL
      AND start_date >= ${ctx.date} - INTERVAL '5 minutes'
      AND start_date <= ${ctx.date} + INTERVAL '15 minutes'
    `,
  );

  // Fetch conferences for those sessions
  const conferences = await ConferenceTable.select(
    ctx.sql,
    ctx.sql`
      id IN ${ctx.sql(upcoming.map((r) => r.conference_id))}
    `,
  );

  // Generate portable information about the conferences
  const info = new Map(
    conferences.map((c) => [c.id, getConferenceInfo(c, ctx.appConfig)]),
  );

  // Get saved sessions who haven't been notified yet
  const saved = await SessionSaveTable.select(
    ctx.sql,
    ctx.sql`
      session_id IN ${ctx.sql(upcoming.map((r) => r.id))}
      AND NOT notified ? 'web-push'
    `,
  );

  // Get devices for people who have saved those sessions
  // which have opted-in to MySchedule messages and are not expired
  const devices = await WebPushDeviceTable.select(
    ctx.sql,
    ctx.sql`
      registration_id IN ${ctx.sql(saved.map((r) => r.registration_id))}
      AND categories ? 'MySchedule'
      AND (
        expires_at IS NULL
        OR expires_at >= NOW()
      )
    `,
  );

  ctx.log("saves=%o devices=%o", saved.length, devices.length);

  const sessions = new Map(upcoming.map((s) => [s.id, s]));

  // Generate a list of messages to enqueu
  const queue: PendingMessage[] = [];

  // Loop through each saved session & fetch info
  for (const save of saved) {
    const session = sessions.get(save.session_id)!;
    const conference = info.get(session.conference_id)!;
    const userDevices = devices.filter(
      (r) => r.registration_id === save.registration_id,
    );

    // Loop through each device and generate a message to send
    for (const device of userDevices) {
      queue.push({
        deviceId: device.id,
        saveId: save.id,
        payload: {
          title: "Session starting soon",
          body: session.title.en!,
          data: {
            url: getSessionUrl(conference.sessionUrl, session.id),
          },
        },
      });
    }
  }

  // Exit early and dump information during a dry run
  if (ctx.options.dryRun) {
    console.log("Enqueue:");
    console.log(JSON.stringify(queue));
    return;
  }

  // Process the queue of messages with a transaction for each
  // NOTE: could be one big transaction?
  for (const item of queue) {
    await ctx.sql.begin(async (trx) => {
      ctx.log(
        "enqueue device=%o save=%o title=%o",
        item.deviceId,
        item.saveId,
        item.payload.title,
      );

      // Insert a pending web push message
      await WebPushMessageTable.insertOne(trx, {
        device_id: item.deviceId,
        payload: item.payload,
      });

      // Mark the save as notified
      await trx`
        UPDATE session_saves
        SET notified = notified || '["web-push"]'::jsonb
        WHERE id = ${item.saveId}
      `;
    });
  }
}

async function sendPendingMessages(ctx: NotifyContext) {
  ctx.log("send pending messages…");

  const { messages, devices } = await ctx.webPush.listPending();

  ctx.log("messages=%o devices=%o", messages.length, devices.size);

  if (ctx.options.dryRun) {
    console.log("Pending:");
    console.log(JSON.stringify({ messages, devices }));
    return;
  }

  for (const message of messages) {
    const device = devices.get(message.device_id);
    if (!device) throw new Error("internal error - bad device");

    ctx.log("send message=%o device=%o", message.id, device.id);
    const success = await ctx.webPush.attemptToSend(message, device);
    ctx.log("  success=%o", success);

    await ctx.pause(ctx.options.grace);
  }
}
