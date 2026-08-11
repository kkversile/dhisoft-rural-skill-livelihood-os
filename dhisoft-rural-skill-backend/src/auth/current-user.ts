import { createParamDecorator,ExecutionContext } from '@nestjs/common'; export const CurrentUser=createParamDecorator((_d:string|undefined,c:ExecutionContext)=>c.switchToHttp().getRequest().user);
