import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthUser } from './auth/auth.guard';
import { CurrentUser } from './auth/current-user';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) { return this.dashboard.get(user.tenantId); }
}
