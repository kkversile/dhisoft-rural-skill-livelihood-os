-- Additive eventing foundation. Existing tables and migrations are unchanged.
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventVersion" INTEGER NOT NULL DEFAULT 1,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcessedEvent" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "consumerName" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_eventId_key" ON "OutboxEvent"("eventId");
CREATE INDEX "OutboxEvent_publishedAt_availableAt_lockedAt_idx" ON "OutboxEvent"("publishedAt", "availableAt", "lockedAt");
CREATE INDEX "OutboxEvent_tenantId_eventType_createdAt_idx" ON "OutboxEvent"("tenantId", "eventType", "createdAt");
CREATE UNIQUE INDEX "ProcessedEvent_eventId_consumerName_key" ON "ProcessedEvent"("eventId", "consumerName");
CREATE INDEX "ProcessedEvent_tenantId_processedAt_idx" ON "ProcessedEvent"("tenantId", "processedAt");

ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProcessedEvent" ADD CONSTRAINT "ProcessedEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
