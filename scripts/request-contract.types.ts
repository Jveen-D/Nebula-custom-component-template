import { request } from '../src/utils/request'
import type { HostRequestOptions } from '../src/utils/request/types'

async function checkContract() {
  const options: HostRequestOptions = {
    method: 'POST',
    data: { id: 'example' },
    autoBoxParam: false,
    autoApiPrefix: false,
    skipErrorThrower: true,
    skipErrorHandler: true,
  }
  const response = await request<{ data: { id: string }; code: number }>('/example', options)
  const id: string = response.data.id
  const code: number = response.code
  await request('/example', {})
  await window.core.request<{ ok: boolean }>('/example', { method: 'get' })
  const unknownResponse = await request('/example', options)

  // @ts-expect-error Unspecified response data must be narrowed by the caller.
  const unverified: string = unknownResponse.data
  // @ts-expect-error A URL must be a string.
  request(42, {})
  // @ts-expect-error Options remain a required argument, as in the host request signature.
  request('/example')
  // @ts-expect-error Request options cannot be null.
  request('/example', null)
  // @ts-expect-error Catch misspelled HTTP methods.
  request('/example', { method: 'POTS' })
  // @ts-expect-error Host behavior flags must be boolean.
  request('/example', { skipErrorHandler: 'yes' })
  // @ts-expect-error The global host member must use the same contract, not Window's legacy index signature.
  window.core.request('/example', { autoBoxParam: 'no' })

  return { id, code, unverified }
}

void checkContract
