export interface SendPlainOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SendTemplatedOptions {
  to: string;
  type: "login";
  arguments: {
    code: number;
    url: string;
  };
}

export interface EmailService {
  sendPlain(options: SendPlainOptions): Promise<boolean>;
  sendTemplated(options: SendTemplatedOptions): Promise<boolean>;
}

export interface SendgridOptions {
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

// TODO: rewrite to "EmailService" + check for deconf://oob
// TODO: customise per conference?

export class SendgridService implements EmailService {
  // options: SendgridOptions;
  constructor() {
    // this.options = options;
  }

  async sendPlain(options: SendPlainOptions): Promise<boolean> {
    console.log(
      "[sendgrind] to=%o subject=%o",
      options.to,
      options.subject,
      options.html,
    );
    return true;

    // const tracking_settings = {
    //   click_tracking: { enable: false },
    //   open_tracking: { enable: false },
    //   subscription_tracking: { enable: false },
    //   ganalytics: { enable: false },
    // };

    // const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    //   method: "POST",
    //   headers: {
    //     authorization: `Bearer ${this.options.apiKey}`,
    //     "content-type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     tracking_settings,
    //     from: {
    //       name: this.options.fromName,
    //       email: this.options.fromAddress,
    //     },
    //     personalizations: [{ to: [{ name: "", email: to }] }],
    //     subject: subject,
    //     content: [{ type: "text/html", value: html }],
    //   }),
    // });

    // return res.ok;
  }

  async sendTemplated(options: SendTemplatedOptions): Promise<boolean> {
    console.log(
      "[sendgrind] to=%o type=%o",
      options.to,
      options.type,
      options.arguments,
    );
    return true;

    // const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    //   method: "POST",
    // });
  }
}
