export interface SendEmailOptions {
  subject: string;
  to: string;
  html: string;
}

export interface EmailService {
  send(options: SendEmailOptions): Promise<boolean>;
}

export interface SendgridOptions {
  apiKey: string;
  fromAddress: string;
  fromName: string;
}

export interface AbstractEmailService {
  send(options: SendEmailOptions): Promise<boolean>;
}

export class SendgridService implements EmailService {
  options: SendgridOptions;
  constructor(options: SendgridOptions) {
    this.options = options;
  }

  async send({ subject, to, html }: SendEmailOptions): Promise<boolean> {
    const tracking_settings = {
      click_tracking: { enable: false },
      open_tracking: { enable: false },
      subscription_tracking: { enable: false },
      ganalytics: { enable: false },
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tracking_settings,
        from: {
          name: this.options.fromName,
          email: this.options.fromAddress,
        },
        personalizations: [{ to: [{ name: "", email: to }] }],
        subject: subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    return res.ok;
  }
}
