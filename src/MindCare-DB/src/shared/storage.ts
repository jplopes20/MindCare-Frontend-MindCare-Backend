import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID, createCipheriv, createDecipheriv, createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'

export interface FileUpload {
  buffer: Buffer
  mimetype: string
  originalName: string
  size: number
}

export interface StorageProvider {
  upload(file: FileUpload, folder?: string): Promise<{ key: string; url: string }>
  getAccessUrl(key: string, expiresInSeconds?: number): Promise<string>
  delete(key: string): Promise<void>
}

class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT
    this.bucket = process.env.STORAGE_BUCKET ?? ''

    const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
      region: process.env.STORAGE_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
      },
    }
    if (endpoint) {
      clientConfig.endpoint = endpoint
      clientConfig.forcePathStyle = true
    }
    this.client = new S3Client(clientConfig)
  }

  async upload(file: FileUpload, folder = 'documents') {
    const key = `${folder}/${randomUUID()}-${file.originalName}`
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      }),
    )
    return { key, url: key }
  }

  async getAccessUrl(key: string, expiresInSeconds = 3600) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    )
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    )
  }
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string
  private encKey: Buffer

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH ?? join(process.cwd(), 'uploads')
    const raw = process.env.ENCRYPTION_KEY ?? ''
    this.encKey = createHash('sha256').update(raw).digest()
  }

  private encryptBuffer(buf: Buffer): Buffer {
    const iv = createHash('md5').update(randomUUID()).digest()
    const cipher = createCipheriv('aes-256-cbc', this.encKey, iv)
    return Buffer.concat([iv, cipher.update(buf), cipher.final()])
  }

  private decryptBuffer(buf: Buffer): Buffer {
    const iv = buf.subarray(0, 16)
    const data = buf.subarray(16)
    const decipher = createDecipheriv('aes-256-cbc', this.encKey, iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  async upload(file: FileUpload, folder = 'documents') {
    const key = `${folder}/${randomUUID()}-${file.originalName}`
    const fullPath = join(this.basePath, key)
    await mkdir(dirname(fullPath), { recursive: true })
    const encrypted = this.encryptBuffer(file.buffer)
    await writeFile(fullPath, encrypted)
    return { key, url: key }
  }

  async getAccessUrl(key: string) {
    return key
  }

  async delete(key: string) {
    const fullPath = join(this.basePath, key)
    await unlink(fullPath).catch(() => {})
  }
}

let provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = process.env.STORAGE_BUCKET
      ? new S3StorageProvider()
      : new LocalStorageProvider()
  }
  return provider
}
