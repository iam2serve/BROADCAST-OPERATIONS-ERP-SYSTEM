import { Injectable } from '@nestjs/common';

import { type AppConfig, loadConfig } from '@broadcast/config';

@Injectable()
export class AppConfigService {
  readonly values: AppConfig = loadConfig();

  get port(): number {
    return Number(process.env.PORT ?? 4000);
  }
}
