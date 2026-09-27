import { PrismaClient } from '@prisma/client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const course = await prisma.course.findFirst({ where: { videoStorageKey: { not: null } }, orderBy: { id: 'desc' } });
if (!course?.videoStorageKey) throw new Error('No uploaded course video found');
const endpoint = process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT || 'http://127.0.0.1:4567';
const client = new S3Client({ endpoint, region: process.env.AWS_REGION || 'ap-south-1', forcePathStyle: true, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' } });
const result = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET || 'rural-private', Key: course.videoStorageKey }));
const bytes = Buffer.from(await result.Body.transformToByteArray());
console.log(JSON.stringify({ courseId: course.id, title: course.title, key: course.videoStorageKey, bytes: bytes.length, magic: bytes.subarray(0, 12).toString('hex') }));
await writeFile('test-assets-latest-course-video.mp4', bytes);
await prisma.$disconnect();
