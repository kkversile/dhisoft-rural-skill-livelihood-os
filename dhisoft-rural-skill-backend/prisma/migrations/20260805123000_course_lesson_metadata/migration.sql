-- Store non-sensitive YouTube oEmbed metadata with the course lesson.
ALTER TABLE "Course"
  ADD COLUMN "lessonTitle" TEXT,
  ADD COLUMN "lessonAuthor" TEXT,
  ADD COLUMN "lessonAuthorUrl" TEXT,
  ADD COLUMN "lessonThumbnailUrl" TEXT;
