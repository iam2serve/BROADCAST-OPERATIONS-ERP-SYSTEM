import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../system/app-config.service.js';

@Injectable()
export class EncryptionService {
  constructor(private readonly config: AppConfigService) {}

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return JSON.stringify({
      v: this.config.values.FIELD_ENCRYPTION_KEY_VERSION,
      iv: iv.toString('base64url'),
      tag: tag.toString('base64url'),
      data: encrypted.toString('base64url'),
    });
  }

  decrypt(payload: string): string {
    const parsed = JSON.parse(payload) as { iv: string; tag: string; data: string };
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(parsed.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64url'));

    return Buffer.concat([
      decipher.update(Buffer.from(parsed.data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private key(): Buffer {
    return createHash('sha256').update(this.config.values.FIELD_ENCRYPTION_KEY).digest();
  }
}
