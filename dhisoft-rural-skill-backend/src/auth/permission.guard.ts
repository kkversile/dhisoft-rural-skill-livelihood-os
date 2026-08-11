import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can } from './permissions';
import { REQUIRED_PERMISSION } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const action = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [context.getHandler(), context.getClass()]) ?? 'read';
    const request = context.switchToHttp().getRequest<{ user?: { role: string } }>();
    if (!request.user || !can(request.user.role, action)) throw new ForbiddenException('Permission denied');
    return true;
  }
}
