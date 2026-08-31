/**
 * 腾讯云 COS 图床上传（Node 侧，仅 dev 加载）。
 * 取代已失效的 SM.MS：密钥（SecretId/SecretKey）由调用方从 .env.local 注入，
 * 绝不回传浏览器/构建产物。上传返回你的自定义域名 URL。
 *
 * 安全建议：SecretId/SecretKey 请用 CAM 子账号、仅授予该 Bucket 的 PutObject
 * 权限，勿用主账号密钥；如 Bucket 私有，请给 CDN 开"私有回源"，否则图片读不到。
 */
import crypto from 'node:crypto'
import COS from 'cos-nodejs-sdk-v5'

export interface UploadResult {
  url: string
}

export class CosError extends Error {
  constructor(message: string, readonly cause_?: unknown) {
    super(message)
    this.name = 'CosError'
  }
}

export interface CosConfig {
  secretId: string
  secretKey: string
  /** Bucket，格式 `name-appid`，如 `blog-1250000000` */
  bucket: string
  /** COS 地域，如 `ap-guangzhou` */
  region: string
  /** 对外访问域名（你的自定义/CDN 域名），如 `https://img.example.com` */
  domain: string
  /** 对象前缀，默认 `uploads` */
  keyPrefix?: string
}

export interface UploadFile {
  data: Buffer
  filename: string
  mime: string
}

/** 可注入的 COS 客户端，便于单测（对齐官方 putObject 的双回调签名）。 */
export interface CosClientLike {
  putObject(
    params: Record<string, unknown>,
    callback: (err: unknown, data: unknown) => void,
  ): void
}

type UploadFn = (f: UploadFile) => Promise<UploadResult>

/** 校验配置是否齐全；缺项抛 CosError（中文提示，routes 会映射为 503）。 */
export function assertCosConfig(cfg: Partial<CosConfig> | null | undefined): CosConfig {
  const missing: string[] = []
  const required: Array<[string, string]> = [
    ['secretId', cfg?.secretId ?? ''],
    ['secretKey', cfg?.secretKey ?? ''],
    ['bucket', cfg?.bucket ?? ''],
    ['region', cfg?.region ?? ''],
    ['domain', cfg?.domain ?? ''],
  ]
  for (const [name, val] of required) {
    if (typeof val !== 'string' || val.length === 0) missing.push(`COS_${name.toUpperCase()}`)
  }
  if (missing.length) {
    throw new CosError(
      `COS 未配置：请在项目根 .env.local 设置 ${missing.join('、')}`,
    )
  }
  return {
    secretId: cfg!.secretId,
    secretKey: cfg!.secretKey,
    bucket: cfg!.bucket,
    region: cfg!.region,
    domain: cfg!.domain,
    keyPrefix: cfg!.keyPrefix?.trim() || 'uploads',
  }
}

/** 按 mime/后缀推断文件扩展名（纯函数）。 */
export function extFor(filename: string, mime: string): string {
  const fromName = /\.([A-Za-z0-9]+)$/.exec(filename)?.[1]
  if (fromName && /^(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(fromName)) {
    return fromName.toLowerCase()
  }
  const fromMime = /^image\/([a-z0-9+.-]+)/.exec(mime ?? '')?.[1]
  if (fromMime === 'jpeg') return 'jpg'
  return fromMime || 'bin'
}

/** 生成对象 Key：`uploads/YYYY/MM/<uuid>.<ext>`（纯函数，可测；uuid 天然防目录穿越）。 */
export function buildCosObjectKey(
  filename: string,
  mime: string,
  prefix = 'uploads',
  date = new Date(),
  id = crypto.randomUUID(),
): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const ext = extFor(filename, mime)
  return `${prefix.replace(/\/+$/u, '')}/${y}/${m}/${id}.${ext}`
}

/** 拼接对外 URL：domain 去掉末尾斜杠 + key（纯函数）。 */
export function buildCosUrl(domain: string, key: string): string {
  const base = domain.replace(/\/+$/u, '')
  const k = key.startsWith('/') ? key : `/${key}`
  return `${base}${k}`
}

export function createCosUploader(
  cfg: CosConfig,
  client?: CosClientLike,
): UploadFn {
  const cos: CosClientLike =
    client ??
    new COS({
      SecretId: cfg.secretId,
      SecretKey: cfg.secretKey,
    })

  return async (file: UploadFile): Promise<UploadResult> => {
    const key = buildCosObjectKey(file.filename, file.mime, cfg.keyPrefix)
    const params = {
      Bucket: cfg.bucket,
      Region: cfg.region,
      Key: key,
      Body: file.data,
      ContentType: file.mime || 'application/octet-stream',
      // 图片需公读才能被浏览器直接访问；Bucket 设为「私有写、公开读」对象级保持一致
      ACL: 'public-read' as const,
    }
    try {
      await new Promise<void>((resolve, reject) => {
        cos.putObject(params, (err, _data) => (err ? reject(err) : resolve()))
      })
    } catch (err) {
      throw new CosError(`上传失败：${err instanceof Error ? err.message : String(err)}`, err)
    }
    return { url: buildCosUrl(cfg.domain, key) }
  }
}