import { Module } from '@nestjs/common';

import { SystemModule } from '../../system/system.module.js';
import { EncryptionService } from './encryption.service.js';

@Module({
  imports: [SystemModule],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SecurityModule {}
