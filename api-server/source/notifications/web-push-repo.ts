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

    try {
      // Try to send the message
      await webPush.sendNotification(
        { endpoint: device.endpoint, keys: device.keys },
        JSON.stringify(message.payload),
        { headers: { "Content-Type": "application/json" } },
      );

      // Mark the message as sent
      await WebPushMessageTable.updateOne(
        this.sql,
        this.sql`id = ${message.id}`,
        { state: "sent", updated_at: new Date() },
      );

      return true;
    } catch (error) {
      console.error("Failed to send web-push", error);

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
  }
}
