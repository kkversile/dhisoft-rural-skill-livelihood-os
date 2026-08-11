import { CanActivate,ExecutionContext,Injectable,UnauthorizedException } from '@nestjs/common';import { JwtService } from '@nestjs/jwt';import { PrismaService } from '../prisma/prisma.service';import { createHash,timingSafeEqual } from 'node:crypto';
export interface AuthUser { id:string; tenantId:string; role:string; sessionId:string; }
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
@Injectable() export class AuthGuard implements CanActivate {
  constructor(private jwt:JwtService,private p:PrismaService){}
  async canActivate(c:ExecutionContext){
    const req=c.switchToHttp().getRequest(); const token=req.cookies?.access_token;
    if(!token) throw new UnauthorizedException();
    try {
      const payload=await this.jwt.verifyAsync<Record<string,unknown>>(token,{secret:process.env.JWT_ACCESS_SECRET!});
      if(payload.type!=='access'||typeof payload.sub!=='string'||typeof payload.tenantId!=='string'||typeof payload.sid!=='string') throw new Error('invalid token');
      const session=await this.p.authSession.findFirst({where:{id:payload.sid,tenantId:payload.tenantId,userId:payload.sub,revokedAt:null},include:{user:true,tenant:true}});
      if(!session||session.expiresAt<=new Date()||session.user.status!=='ACTIVE'||session.tenant.status!=='ACTIVE'||session.user.tokenVersion!==payload.ver) throw new Error('invalid session');
      if(req.method!=='GET'&&req.method!=='HEAD'&&req.method!=='OPTIONS') {
        const csrfCookie=req.cookies?.csrf_token; const csrfHeader=req.headers['x-csrf-token'];
        if(typeof csrfCookie!=='string'||typeof csrfHeader!=='string'||csrfCookie!==csrfHeader) throw new UnauthorizedException('CSRF validation failed');
        const expected=Buffer.from(session.csrfTokenHash); const actual=Buffer.from(digest(csrfCookie));
        if(expected.length!==actual.length||!timingSafeEqual(expected,actual)) throw new UnauthorizedException('CSRF validation failed');
      }
      await this.p.authSession.update({where:{id:session.id},data:{lastSeenAt:new Date()}});
      req.user={id:session.user.id,tenantId:session.tenantId,role:session.user.role,sessionId:session.id} satisfies AuthUser;
      return true;
    } catch(error) { if(error instanceof UnauthorizedException) throw error; throw new UnauthorizedException(); }
  }
}
