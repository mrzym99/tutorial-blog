import { describe, it, expect, vi } from 'vitest'
import { uploadToSmms, SmmsError } from './upload-smms'

const URL = 'https://sm.ms/api/v2/upload'
const buf = Buffer.from('fake-image')
const opts = (impl: typeof fetch) => ({ fetchFn: impl })

describe('uploadToSmms', () => {
  it('成功返回 { url }', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, data: { url: 'https://i.example/x.png' } }), {
        status: 200,
      }),
    )
    const result = await uploadToSmms('TOKEN', buf, 'a.png', 'image/png', opts(fetchFn))
    expect(result.url).toBe('https://i.example/x.png')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'TOKEN' },
      }),
    )
  })

  it('Token 缺失抛带中文提示的错误，且不发起请求', async () => {
    const fetchFn = vi.fn()
    await expect(
      uploadToSmms('', buf, 'a.png', 'image/png', opts(fetchFn)),
    ).rejects.toThrow('SMMS_TOKEN 未配置')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('SM.MS 返回业务错误（success:false）时抛出含其 message 的错误', async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ success: false, message: '图片超大小限制' }), {
        status: 200,
      }),
    )
    await expect(
      uploadToSmms('TOKEN', buf, 'a.png', 'image/png', opts(fetchFn)),
    ).rejects.toBeInstanceOf(SmmsError)
    await expect(
      uploadToSmms('TOKEN', buf, 'a.png', 'image/png', opts(fetchFn)),
    ).rejects.toThrow('图片超大小限制')
  })

  it('HTTP 非 2xx 归一化为错误', async () => {
    const fetchFn = vi.fn(async () => new Response('upstream', { status: 502 }))
    await expect(
      uploadToSmms('TOKEN', buf, 'a.png', 'image/png', opts(fetchFn)),
    ).rejects.toThrow('上传失败')
  })

  it('网络失败时抛归一化错误（携带 cause）', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    const p = uploadToSmms('TOKEN', buf, 'a.png', 'image/png', opts(fetchFn))
    await expect(p).rejects.toThrow('网络错误')
  })
})