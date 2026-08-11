import { Module } from '@nestjs/common'; import { WorkflowController } from './workflow.controller'; import { WorkflowService } from './workflow.service';import { AuthModule } from '../auth/auth.module';
@Module({imports:[AuthModule],controllers:[WorkflowController],providers:[WorkflowService]}) export class WorkflowModule {}
