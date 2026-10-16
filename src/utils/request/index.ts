import type { HostRequest } from './types'

// Keep the original function reference and import-time host lookup unchanged.
export const request: HostRequest = window.core.request
