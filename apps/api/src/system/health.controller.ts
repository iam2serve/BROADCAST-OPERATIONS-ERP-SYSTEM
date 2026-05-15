import { Controller, Get, Version } from '@nestjs/common';

import { Public } from '../modules/auth/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Version('1')
  getHealth() {
    return this.health.liveness();
  }

  @Get('live')
  @Version('1')
  live() {
    return this.health.liveness();
  }

  @Get('ready')
  @Version('1')
  ready() {
    return this.health.readiness();
  }

  @Get('metrics')
  @Version('1')
  metrics() {
    return this.health.metrics();
  }
}
