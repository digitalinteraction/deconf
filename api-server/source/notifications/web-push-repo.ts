import { HTTPError, loader, SqlDependency } from "gruber";
import {
  assertRequestParam,
  ConferenceTable,
  RegistrationTable,
  useAppConfig,
  useDatabase,
  WebPushDeviceRecord,
  WebPushDeviceTable,
  WebPushMessageRecord,
  WebPushMessageTable,
} from "../lib/mod.ts";
import webPush from "web-push";
import { AppConfig } from "../config.ts";

export interface WebPushPayload {
  title: string;
  body: string;
  data: { url: string };
}

export class WebPushRepo {
  static use = loader(() => new this(useDatabase(), useAppConfig()));

  sql: SqlDependency;
  config: AppConfig;
  constructor(sql: SqlDependency, config: AppConfig) {
    this.sql = sql;
    this.config = config;

    // NOTE: I'd prefer if this library exposed an instanced client
    // that we could instantiate here
    webPush.setVapidDetails(
      "mailto:" + config.webPush.contactEmail,
      config.webPush.credentials.publicKey,
      config.webPush.credentials.privateKey,
    );
  }

  with(sql: SqlDependency) {
    return new WebPushRepo(sql, this.config);
  }

  get maxAttempts() {
    return this.config.webPush.maxAttempts;
  }

  async assertRegistered(conferenceId: number | string, userId: number) {
    const conference = await ConferenceTable.selectOne(
      this.sql,
      this.sql`id = ${assertRequestParam(conferenceId)}`,
    );
    if (!conference) throw HTTPError.notFound();

    const registration = await RegistrationTable.selectOne(
      this.sql,
      this.sql`user_id = ${userId}`,
    );
    if (!registration) throw HTTPError.unauthorized();

    return { conference, registration };
  }

  async assertDevice(deviceId: number | string, registrationId: number) {
    const record = await WebPushDeviceTable.selectOne(
      this.sql,
      this.sql`
        id = ${assertRequestParam(deviceId)}
        AND registration_id = ${registrationId}
      `,
    );
    if (!record) throw HTTPError.notFound();
    return record;
  }

  listDevices(registrationId: number) {
    return WebPushDeviceTable.select(
      this.sql,
      this.sql`registration_id = ${registrationId}`,
    );
  }

  createDevice(
    init: Pick<
      WebPushDeviceRecord,
      | "registration_id"
      | "categories"
      | "endpoint"
      | "expires_at"
      | "keys"
      | "name"
    >,
  ) {
    return WebPushDeviceTable.insertOne(this.sql, init);
  }

  updateDevice(
    deviceId: number,
    patch: Partial<Pick<WebPushDeviceRecord, "name" | "categories">>,
  ) {
    return WebPushDeviceTable.updateOne(
      this.sql,
      this.sql`id = ${deviceId}`,
      patch,
    );
  }

  deleteDevice(deviceId: number) {
    return WebPushDeviceTable.delete(this.sql, this.sql`id = ${deviceId}`);
  }

  enqueueMessage<T extends WebPushPayload>(deviceId: number, payload: T) {
    return WebPushMessageTable.insertOne(this.sql, {
      device_id: deviceId,
      payload,
    });
  }

  async attemptToSend(
    message: WebPushMessageRecord,
    device: WebPushDeviceRecord,
  ): Promise<boolean> {
    if (message.retries > this.maxAttempts) return false;

    const sent = await this.send(device.endpoint, device.keys, message.payload);

    if (!sent) {
      // Increase retries and update the state
      await WebPushMessageTable.updateOne(
        this.sql,
        this.sql`id = ${message.id}`,
        {
          state: message.retries + 1 >= this.maxAttempts ? "failed" : "pending",
          updated_at: new Date(),
          retries: message.retries + 1,
        },
      );

      return false;
    }

    // Mark the message as sent
    await WebPushMessageTable.updateOne(
      this.sql,
      this.sql`id = ${message.id}`,
      { state: "sent", updated_at: new Date() },
    );

    return true;
  }

  async send<T extends WebPushPayload>(
    endpoint: string,
    keys: any,
    payload: T,
  ) {
    try {
      // Try to send the message
      await webPush.sendNotification(
        { endpoint, keys },
        JSON.stringify(payload),
        { headers: { "Content-Type": "application/json" } },
      );
      return true;
    } catch {
      return false;
    }
  }

  async listPending() {
    const messages = await WebPushMessageTable.select(
      this.sql,
      this.sql`state = 'pending'`,
    );
    const ids = Array.from(new Set(messages.map((m) => m.device_id)));
    const devices = await WebPushDeviceTable.select(
      this.sql,
      this.sql`id IN ${this.sql(ids)}`,
    );
    return {
      messages,
      devices: new Map(devices.map((d) => [d.id, d])),
    };
  }

  async getInfo(conferenceId: number) {
    const registrations = await RegistrationTable.select(
      this.sql,
      this.sql` conference_id = ${conferenceId} `,
      ["id"],
    );

    const devices = await WebPushDeviceTable.select(
      this.sql,
      this.sql`id IN ${this.sql(registrations.map((r) => r.id))}`,
    );

    const categories = sumCategories(devices);

    const states = await this.sql<MessageStateCount[]>`
      SELECT state, count(*) AS count
      FROM ${this.sql(WebPushMessageTable.tableName)}
      WHERE device_id IN ${this.sql(devices.map((r) => r.id))}
      GROUP BY state
    `;
    const messages = Object.fromEntries(states.map((r) => [r.state, r.count]));

    return { categories, messages };
  }

  async listConferenceDevices(conferenceId: number) {
    const registrations = await RegistrationTable.select(
      this.sql,
      this.sql` conference_id = ${conferenceId} `,
      ["id"],
    );

    return WebPushDeviceTable.select(
      this.sql,
      this.sql`id IN ${this.sql(registrations.map((r) => r.id))}`,
    );
  }
}

interface MessageStateCount {
  state: string;
  count: number;
}

function sumCategories(devices: WebPushDeviceRecord[]) {
  const output: Record<string, number> = {};
  for (const record of devices) {
    for (const category of record.categories) {
      output[category] = (output[category] ?? 0) + 1;
    }
  }
  return output;
}
