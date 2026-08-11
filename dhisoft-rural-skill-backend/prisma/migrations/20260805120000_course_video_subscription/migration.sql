-- Add subscription-gated course video access.
ALTER TABLE "Course"
  ADD COLUMN "youtubeUrl" TEXT,
  ADD COLUMN "subscriptionRequired" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "CourseSubscription" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "courseId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelledAt" TIMESTAMP(3),

  CONSTRAINT "CourseSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseSubscription_tenantId_courseId_userId_key"
  ON "CourseSubscription"("tenantId", "courseId", "userId");
CREATE INDEX "CourseSubscription_tenantId_userId_status_idx"
  ON "CourseSubscription"("tenantId", "userId", "status");
CREATE INDEX "CourseSubscription_tenantId_courseId_status_idx"
  ON "CourseSubscription"("tenantId", "courseId", "status");

ALTER TABLE "CourseSubscription"
  ADD CONSTRAINT "CourseSubscription_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseSubscription"
  ADD CONSTRAINT "CourseSubscription_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseSubscription"
  ADD CONSTRAINT "CourseSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
