import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto';

@Controller('candidates')
@UseGuards(AuthGuard, PermissionGuard)
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}

  @Get()
  @RequirePermission('read')
  list(@CurrentUser() user: AuthUser, @Query('page', new ParseIntPipe({ optional: true })) page = 1, @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20, @Query('search') search = '') {
    return this.service.list(user.tenantId, page, pageSize, search);
  }

  @Post()
  @RequirePermission('create')
  create(@CurrentUser() user: AuthUser, @Body() data: CreateCandidateDto) { return this.service.create(user.tenantId, user.id, data); }

  @Get(':id')
  @RequirePermission('read')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.get(user.tenantId, id); }

  @Patch(':id/verify')
  @RequirePermission('transition')
  verify(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.verify(user.tenantId, user.id, id); }
}
