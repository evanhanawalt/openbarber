export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
  }[];
};

export type SmsMessage = {
  to: string;
  body: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface SmsSender {
  send(message: SmsMessage): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log("[email:stub]", {
      to: message.to,
      subject: message.subject,
      text: message.text,
      attachments: message.attachments?.map((a) => a.filename),
    });
  }
}

export class ConsoleSmsSender implements SmsSender {
  async send(message: SmsMessage): Promise<void> {
    console.log("[sms:stub]", message);
  }
}

export const emailSender: EmailSender = new ConsoleEmailSender();
export const smsSender: SmsSender = new ConsoleSmsSender();
