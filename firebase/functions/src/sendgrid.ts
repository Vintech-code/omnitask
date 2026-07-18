import sgMail, { type MailDataRequired } from '@sendgrid/mail';
import { logger } from 'firebase-functions';

export class EmailDeliveryError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly statusCode?: number) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

const statusFrom = (error: unknown): number | undefined =>
  (error as { code?: number; response?: { statusCode?: number } })?.response?.statusCode
  ?? (error as { code?: number })?.code;

export async function sendEmailWithRetry(apiKey: string, message: MailDataRequired, attempts = 3): Promise<void> {
  sgMail.setApiKey(apiKey);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await sgMail.send(message);
      logger.info('Transactional email accepted by SendGrid', { template: message.customArgs?.template, attempt });
      return;
    } catch (error) {
      lastError = error;
      const statusCode = statusFrom(error);
      const retryable = statusCode === 429 || statusCode === undefined || statusCode >= 500;
      logger.warn('SendGrid delivery attempt failed', { template: message.customArgs?.template, attempt, statusCode, retryable });
      if (!retryable || attempt === attempts) {
        throw new EmailDeliveryError('SendGrid rejected the transactional email.', retryable, statusCode);
      }
      await wait(250 * (2 ** (attempt - 1)));
    }
  }

  throw new EmailDeliveryError(String(lastError), true);
}
