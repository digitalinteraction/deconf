import { HTTPError, loader, SqlDependency } from "gruber";
import {
  assertRequestParam,
  ConferenceTable,
  RegistrationTable,
  useDatabase,
  WebPushDeviceRecord,
  WebPushDeviceTable,
  WebPushMessageTable,
} from "../lib/mod.ts";

export interface WebPushPayload {
  title: string;
  body: string;
  data: { url: string };
}

export class WebPushRepo {
  static use = loader(() => new this(useDatabase()));

  sql: SqlDependency;
  constructor(sql: SqlDependency) {
    this.sql = sql;
  }

  with(sql: SqlDependency) {
    return new WebPushRepo(sql);
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
}
