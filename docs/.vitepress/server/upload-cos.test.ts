import { describe, it, expect } from 'vitest'
import {
  assertCosConfig,
  buildCosObjectKey,
  buildCosUrl,
  createCosUploader,
  extFor,
  CosError,
  type CosClientLike,
} from './upload-cos'

const cfg = {
  secretId: 'sid',
  secretKey: 'skey',
  bucket: 'blog-1250000000',
  region: 'ap-guangzhou',
  domain: 'https://img.example.com',
}

function fakeClient(): CosClientLike & { calls: any[]; fail?: boolean } {
  const calls: any[] = []
  return {
    calls,
    putObject(params: any, cb: (err: unknown, data: unknown) => void) {
      calls.push(params)
      if (this.fail) cb(new Error('AccessDenied'), null)
      else cb(null, { Location: 'x' })
    },
  }
}

describe('assertCosConfig', () => {
  it('缺项时抛 CosError 并列出缺失变量', () => {
    expect(() => assertCosConfig({})).toThrowError(CosError)
    expect(() => assertCosConfig({})).toThrow('COS_SECRETID')
    expect(() =>
      assertCosConfig({ secretId: 's', bucket: 'b', region: 'r', domain: 'd' }),
    ).toThrow('COS_SECRETKEY')
  })

  it('补齐后返回带默认 keyPrefix 的配置', () => {
    const out = assertCosConfig(cfg)
    expect(out.keyPrefix).toBe('uploads')
    expect(out.domain).toBe(cfg.domain)
  })
})

describe('extFor', () => {
  it('优先取文件名后缀，jpeg 归一为 jpg', () => {
    expect(extFor('a.PNG', '')).toBe('png')
    expect(extFor('pic.jpeg', 'image/jpeg')).toBe('jpeg')
    expect(extFor('noext', 'image/jpeg')).toBe('jpg')
  })
})

describe('buildCosObjectKey', () => {
  it('拼成 uploads/年/月/uuid.扩展名', () => {
    const key = buildCosObjectKey('a.png', 'image/png', 'uploads', new Date('2026-08-30'), 'id1')
    expect(key).toBe('uploads/2026/08/id1.png')
  })

  it('未知类型回退 bin；前后缀斜杠归一', () => {
    const key = buildCosObjectKey('f', 'application/octet-stream', 'uploads/', new Date('2026-01-05'), 'x')
    expect(key).toBe('uploads/2026/01/x.bin')
  })
})

describe('buildCosUrl', () => {
  it('domain 末尾斜杠归一，拼接 key', () => {
    expect(buildCosUrl('https://img.example.com/', 'uploads/2026/08/x.png')).toBe(
      'https://img.example.com/uploads/2026/08/x.png',
    )
  })
})

describe('createCosUploader', () => {
  it('成功上传：调 putObject 并返回自定义域名 URL', async () => {
    const client = fakeClient()
    const upload = createCosUploader(cfg, client)
    const res = await upload({ data: Buffer.from('img'), filename: 'a.png', mime: 'image/png' })
    expect(res.url).toMatch(/^https:\/\/img\.example\.com\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/)
    const params = client.calls[0]
    expect(params.Bucket).toBe('blog-1250000000')
    expect(params.Region).toBe('ap-guangzhou')
    expect(params.ACL).toBe('private')
    // Body 必须是上传的真实字节
    expect((params.Body as Buffer).toString()).toBe('img')
  })

  it('COS 返回错误时抛 CosError', async () => {
    const client = fakeClient()
    client.fail = true
    const upload = createCosUploader(cfg, client)
    await expect(
      upload({ data: Buffer.from('i'), filename: 'a.png', mime: 'image/png' }),
    ).rejects.toThrowError(CosError)
  })
})