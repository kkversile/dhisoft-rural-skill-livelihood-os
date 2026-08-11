import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/permission.decorator';
import { WorkflowService } from './workflow.service';
import { RecommendationDto, WorkflowDataDto, WorkflowQueryDto } from './workflow.dto';

@Controller('workflow')
@UseGuards(AuthGuard, PermissionGuard)
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Get('report')
  @RequirePermission('read')
  report(@CurrentUser() user: AuthUser) { return this.service.report(user.tenantId); }

  @Post('recommendations/generate')
  @RequirePermission('create')
  recommend(@CurrentUser() user: AuthUser, @Body() data: RecommendationDto) { return this.service.recommend(user.tenantId, user.id, data.candidateId); }

  @Get('courses/:id/access')
  @RequirePermission('read')
  courseAccess(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.courseAccess(user.tenantId, user.id, id); }

  @Post('courses/:id/subscribe')
  @RequirePermission('create')
  subscribeToCourse(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.subscribeToCourse(user.tenantId, user.id, id); }

  @Get(':resource')
  @RequirePermission('read')
  list(@CurrentUser() user: AuthUser, @Param('resource') resource: string, @Query() query: WorkflowQueryDto) { return this.service.list(user.tenantId, user.id, resource, query); }

  @Post(':resource')
  @RequirePermission('create')
  create(@CurrentUser() user: AuthUser, @Param('resource') resource: string, @Body() data: WorkflowDataDto) { return this.service.create(user.tenantId, user.id, resource, data); }

  @Get(':resource/:id')
  @RequirePermission('read')
  get(@CurrentUser() user: AuthUser, @Param('resource') resource: string, @Param('id') id: string) { return this.service.get(user.tenantId, user.id, resource, id); }

  @Patch(':resource/:id')
  @RequirePermission('update')
  update(@CurrentUser() user: AuthUser, @Param('resource') resource: string, @Param('id') id: string, @Body() data: WorkflowDataDto) { return this.service.update(user.tenantId, user.id, resource, id, data); }
}
