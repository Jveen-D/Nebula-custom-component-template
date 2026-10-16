import type { CSSProperties } from 'react';

/**
 * 宿主传入组件的已观察字段。入口必须继续完整透传 props。
 * customPropsResult 原代码只打印；其结构、数据源映射、表达式消费尚未确认。
 * 此声明不实现数据源订阅、属性解析或向宿主发送事件。
 * @capability host.props
 * @status 仅已观察字段的输入类型，数据源消费和对外事件输出待实现。
 * @param props 宿主完整属性对象；customPropsResult 的业务结构为 unknown。
 * @returns 仅类型声明，不产生运行时返回值。
 * @requires 使用者按实际宿主确认扩展字段；入口原样透传 props。
 * @sideEffects 无。
 * @example const observed: unknown = props.customPropsResult; // 只观察，不解析数据源
 */
export interface HostComponentProps {
  style?: CSSProperties;
  customPropsResult?: unknown;
  [name: string]: unknown;
}
