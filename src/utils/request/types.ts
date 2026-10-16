/** The subset of the host request options used by this template. */
export interface HostRequestOptions {
  method?: 'GET' | 'get' | 'POST' | 'post' | 'PUT' | 'put' | 'PATCH' | 'patch' | 'DELETE' | 'delete' | 'HEAD' | 'head' | 'OPTIONS' | 'options'
  data?: unknown
  autoBoxParam?: boolean
  autoApiPrefix?: boolean
  skipErrorThrower?: boolean
  skipErrorHandler?: boolean
}

/** The only response field this template currently consumes. */
export interface HostRequestResponse {
  data?: unknown
}

/** TResponse describes the complete value returned by the host, not an extra envelope. */
export interface HostRequest {
  <TResponse = HostRequestResponse>(url: string, options: HostRequestOptions): Promise<TResponse>
}

export interface HostCore {
  request: HostRequest
}
