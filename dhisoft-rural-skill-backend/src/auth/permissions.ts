export const ROLES = ['PLATFORM_SUPER_ADMIN','PLATFORM_SUPPORT','TENANT_OWNER','TENANT_ADMIN','PROGRAMME_MANAGER','DISTRICT_MANAGER','FIELD_COORDINATOR','TRAINING_PARTNER_ADMIN','CENTRE_ADMIN','TRAINER','ASSESSOR','EMPLOYER_ADMIN','EMPLOYER_RECRUITER','CUSTOMER','CANDIDATE','CERTIFIED_TECHNICIAN','SUPPORT_AGENT','FINANCE_USER','COMPLIANCE_USER','READ_ONLY_AUDITOR'] as const;
export type Role = typeof ROLES[number];
const all = ['read','create','update','transition','export'] as const;
const manager = new Set<string>(['read','create','update','transition','export']);
export const permissions: Record<string,Set<string>> = Object.fromEntries(ROLES.map(role=>[role,manager])) as Record<string,Set<string>>;
for (const role of ['CANDIDATE','CUSTOMER']) permissions[role]=new Set(['read','create','update']);
for (const role of ['READ_ONLY_AUDITOR']) permissions[role]=new Set(['read','export']);
export function can(role:string,action:string){return permissions[role]?.has(action)??false;}
export { all };
