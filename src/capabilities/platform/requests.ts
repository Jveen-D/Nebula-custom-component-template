import type { HostRequest, HostRequestOptions, HostRequestResponse } from '../../utils/request/types';

/**
 * @capability platform.request
 * @status 已实现宿主适配；不在此实现 HTTP、认证或响应包装。
 * @param 无。
 * @returns 原始 window.core.request 函数引用，不绑定、不包装。
 * @requires 调用时宿主已提供 window.core.request；仅在调用时读取宿主。
 * @sideEffects 只读取宿主对象，不发送请求。
 * @example getHostRequest()('/your/api', { method: 'POST', data: input })
 */
export function getHostRequest(): HostRequest {
  const core = typeof window === 'undefined' ? undefined : window.core;
  if (!core || typeof core.request !== 'function') {
    throw new Error('需要宿主提供 window.core.request，或显式传入请求函数。');
  }
  return core.request;
}

/** 仅按原示例的字段建模；下游 URL、请求体及认证规则须由平台确认。 */
export interface ExternalApiCall {
  url: string;
  method: NonNullable<HostRequestOptions['method']>;
  headers: Record<string, string>;
  requestBody: unknown;
  requestParam: unknown;
}

/** 原视角接口示例的字段；definedType、图片格式及视角值域须由宿主确认。 */
export interface VisualAngleInput {
  base64Image: string;
  definedType: number;
  projId: string;
  resourceId: string;
  visualAngle: string;
}

/**
 * @capability platform.app-query
 * @status 仅业务接口示例；真实参数和响应结构待平台确认。
 * @param param 原代码传入 UUID 字符串，此处不擅自变为 { uuid } 或二次封装。
 * @param request 可选宿主请求函数，省略时调用 getHostRequest()。
 * @returns 完整宿主响应的 Promise，原样传播拒绝。
 * @requires 对应平台接口可访问；宿主决定默认参数包装及鉴权。
 * @sideEffects 调用时发送一次 POST；导入模块不请求。
 * @example const response = await getAppByUuid(appUuid); // 确认响应结构后再取 response.data
 */
export function getAppByUuid<T = HostRequestResponse>(param: unknown, request: HostRequest = getHostRequest()): Promise<T> {
  return request<T>('bjgraphicplatform/app/getAppByUuid', { method: 'POST', data: param });
}

/**
 * @capability platform.external-api
 * @status 已提取原代调写法；仅示例，后端转发协议和目标可达性待确认。
 * @param param 下游请求描述；没有默认域名或默认业务参数。
 * @param request 可选宿主请求函数。
 * @returns 完整宿主响应的 Promise，不自动取 data。
 * @requires 平台 executeApiCall 接口可用，调用方确认目标 URL、权限和参数。
 * @sideEffects 向平台发 POST；不是浏览器直接向 param.url 发请求。
 * @example await executeApiCall({ url, method: 'GET', headers: {}, requestBody: {}, requestParam: {} })
 */
export async function executeApiCall<T = HostRequestResponse>(param: ExternalApiCall, request: HostRequest = getHostRequest()): Promise<T> {
  return request<T>('bjgraphicplatform/apiConfig/executeApiCall', {
    method: 'POST', data: param, skipErrorHandler: true,
  });
}

/**
 * @capability platform.dictionary
 * @status 仅原业务查询示例；字典码和响应结构须由使用者提供并确认。
 * @param parentDictCode 字典父编码；request 为可选宿主请求函数。
 * @returns 完整宿主响应的 Promise。
 * @requires 平台字典接口可访问；各请求选项的实现由宿主负责。
 * @sideEffects 调用时请求；保留原 data.param、autoBoxParam/skipErrorThrower 写法，不补猜默认 method。
 * @example const response = await getDictionaryValues(parentDictCode)
 */
export function getDictionaryValues<T = HostRequestResponse>(parentDictCode: string, request: HostRequest = getHostRequest()): Promise<T> {
  return request<T>('/bjsystem/dict/searchDictValueByParam', {
    data: { param: { parentDictCode } }, autoBoxParam: false, skipErrorThrower: true,
  });
}

/**
 * @capability platform.visual-angle
 * @status 待宿主确认；保留原视角接口写法，不能视为已经真实平台验收。
 * @param input 必须显式提供项目/资源/图片/视角字段；request 可选。
 * @returns 完整宿主响应的 Promise。
 * @requires 确认字段、默认 method、权限和写入范围后才能调用。
 * @sideEffects 可能更改平台视角数据；仅显式调用，不在挂载、导入时运行。
 * @example await setVisualAngle(input) // 先确认并填写 input，禁止直接复用企业项目 ID
 */
export function setVisualAngle<T = HostRequestResponse>(input: VisualAngleInput, request: HostRequest = getHostRequest()): Promise<T> {
  return request<T>('/newblackholeapi/blackHole3D/project/userDefined/v3/SetVisualAngle', {
    data: input, autoBoxParam: false, skipErrorThrower: true, autoApiPrefix: false,
  });
}
