import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { successResponse, errorResponse } from '@/lib/api'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
})

export async function POST(request) {
  try {
    const { fileName, fileType, folder } = await request.json()

    if (!fileName || !fileType) {
      return errorResponse('fileName and fileType are required')
    }

    // Generate unique key
    const ext       = fileName.split('.').pop()
    const unique    = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    const key       = `${folder || 'uploads'}/${unique}.${ext}`

    const command = new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME,
      Key:         key,
      ContentType: fileType,
    })

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const publicUrl    = `${process.env.R2_PUBLIC_URL}/${key}`

    return successResponse({ presignedUrl, publicUrl, key })
  } catch (error) {
    console.error('Presign error:', error)
    return errorResponse('Failed to generate upload URL', 500)
  }
}
