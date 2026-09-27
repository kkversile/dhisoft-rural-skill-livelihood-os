ALTER TABLE "Course"
  ADD COLUMN "videoStorageKey" TEXT,
  ADD COLUMN "videoOriginalName" TEXT,
  ADD COLUMN "videoMimeType" TEXT,
  ADD COLUMN "videoSizeBytes" INTEGER,
  ADD COLUMN "videoSha256" TEXT;
