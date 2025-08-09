// import * as jose from "jose";
import { AppConfig } from "../config.ts";

export interface SendPlainOptions {
  to: { emailAddress: string; name?: string };
  subject: string;
  body: string;
}

export interface SendTemplatedOptions {
  to: { emailAddress: string; name?: string };
  type: "login";
  arguments: {
    oneTimeCode: number;
    magicLink: string;
  };
}

export interface EmailService {
  sendPlain(options: SendPlainOptions): Promise<boolean>;
  sendTemplated(options: SendTemplatedOptions): Promise<boolean>;
}

export interface EmailOptions {
  endpoint: URL;
  apiKey: string;
}

// TODO: rewrite to "EmailService" + check for deconf://oob
// TODO: customise per conference?

export class DebugEmailService implements EmailService {
  async sendPlain(options: SendPlainOptions): Promise<boolean> {
    console.log(
      "[debug email] to=%o subject=%o",
      options.to.emailAddress,
      options.subject,
      options.body,
    );
    return true;
  }

  async sendTemplated(options: SendTemplatedOptions): Promise<boolean> {
    console.log(
      "[debug email] to=%o type=%o",
      options.to.emailAddress,
      options.type,
      options.arguments,
    );
    return true;
  }
}

export class ExternalEmailService implements EmailService {
  options;
  appConfig;
  constructor(options: EmailOptions, appConfig: AppConfig) {
    this.options = options;
    this.appConfig = appConfig;
  }

  async sendPlain(options: SendPlainOptions): Promise<boolean> {
    // const token = await new jose.SignJWT({
    //   sub: this.options.endpoint.toString(),
    // })
    //   .setIssuer(this.appConfig.jwt.issuer)
    //   .setProtectedHeader({ alg: this.appConfig.jwt.key.alg, scope: "email" })
    //   .setExpirationTime("5m")
    //   .sign(this.appConfig.jwt.key);

    const res = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        // Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "plain",
        to: options.to,
        subject: options.subject,
        body: options.body,
      }),
    });

    return res.ok;
  }

  async sendTemplated(options: SendTemplatedOptions): Promise<boolean> {
    // const token = await new jose.SignJWT({
    //   sub: this.options.endpoint.toString(),
    // })
    //   .setIssuer(this.appConfig.jwt.issuer)
    //   .setProtectedHeader({ alg: this.appConfig.jwt.key.alg, scope: "email" })
    //   .setExpirationTime("5m")
    //   .sign(this.appConfig.jwt.key);

    const res = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        // Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "template",
        to: options.to,
        template: options.type,
        arguments: options.arguments,
      }),
    });

    return res.ok;
  }
}
