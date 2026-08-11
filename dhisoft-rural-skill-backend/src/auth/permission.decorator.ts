import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSION = 'required_permission';
export const RequirePermission = (action: string) => SetMetadata(REQUIRED_PERMISSION, action);
