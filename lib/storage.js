import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME
const PUBLIC_URL = process.env.R2_PUBLIC_URL

// Upload file buffer to R2
export async function uploadFile(buffer, originalName, folder = 'uploads') {
  const ext      = originalName.split('.').pop()
  const fileName = `${folder}/${uuidv4()}.${ext}`

  await R2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key:    fileName,
    Body:   buffer,
    ContentType: getContentType(ext),
  }))

  return `${PUBLIC_URL}/${fileName}`
}

// Delete file from R2
export async function deleteFile(fileUrl) {
  const key = fileUrl.replace(`${PUBLIC_URL}/`, '')
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// Get presigned upload URL (for direct browser upload)
export async function getPresignedUrl(fileName, folder = 'uploads') {
  const ext  = fileName.split('.').pop()
  const key  = `${folder}/${uuidv4()}.${ext}`

  const url = await getSignedUrl(R2, new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: getContentType(ext),
  }), { expiresIn: 300 }) // 5 minutes

  return { uploadUrl: url, fileUrl: `${PUBLIC_URL}/${key}`, key }
}

function getContentType(ext) {
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',  gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg', wav: 'audio/wav',
    mp4: 'video/mp4',  webm: 'video/webm',
  }
  return types[ext?.toLowerCase()] || 'application/octet-stream'
}
