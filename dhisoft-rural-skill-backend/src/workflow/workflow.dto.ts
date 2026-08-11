import { IsObject,IsOptional,IsString,MaxLength,Min,IsInt } from 'class-validator';
export class WorkflowDataDto { @IsObject() data!: Record<string,unknown>; @IsOptional() @IsString() @MaxLength(64) status?: string; }
export class WorkflowQueryDto { @IsOptional() @IsInt() @Min(1) page = 1; @IsOptional() @IsInt() @Min(1) pageSize = 20; @IsOptional() @IsString() search?: string; @IsOptional() @IsString() status?: string; @IsOptional() @IsString() sort?: string; @IsOptional() @IsString() direction?: 'asc'|'desc'; }
export class RecommendationDto { @IsString() candidateId!: string; }
