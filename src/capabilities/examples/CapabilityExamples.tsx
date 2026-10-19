import { Button, Input } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import type { HostComponentProps } from '../host/props'
import {
  executeApiCall,
  getAppByUuid,
  getDictionaryValues,
  resetElementAppearance,
  setElementAppearance,
  setLinkedElementsVisible,
  setVisualAngle,
  subscribeToSelection,
} from '../index'
import type { CapabilityExampleConfig } from './config'

function configured<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`请先配置 ${name} 并确认宿主协议。`)
  return value
}

function display(value: unknown): string {
  if (value === undefined) return '执行完成（无返回值）'
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return '结果无法序列化，请检查宿主返回结构。'
  }
}

/**
 * AI 调用参考：不由默认主组件或公共能力入口导入。
 * 手动阅读/复用时，仅点击调用能力，不在挂载时请求或自动订阅。
 * props 结果只供观察，不实现数据源消费或表达式解析；所有业务目标从 config 显式提供。
 */
export function CapabilityExamples({
  hostProps,
  config,
}: { hostProps: HostComponentProps; config: CapabilityExampleConfig }) {
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkedVisible, setLinkedVisible] = useState(true)
  const [listening, setListening] = useState(false)
  const stopSelection = useRef<(() => void) | undefined>()
  useEffect(
    () => () => {
      stopSelection.current?.()
    },
    [],
  )

  const run = async (action: () => unknown | Promise<unknown>) => {
    setBusy(true)
    try {
      setOutput(display(await action()))
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const startSelection = () => {
    stopSelection.current?.()
    stopSelection.current = subscribeToSelection(selection => setOutput(display(selection)))
    setListening(true)
    return '已开始监听构件选择；离开组件时自动清理。'
  }
  const stopListening = () => {
    stopSelection.current?.()
    stopSelection.current = undefined
    setListening(false)
    return '已停止监听。'
  }

  return (
    <section aria-label='可选能力示例'>
      <p>填写示例配置后按需执行；三维范围及接口参数须先由宿主确认。</p>
      <Button disabled={busy} onClick={() => run(() => hostProps.customPropsResult)}>
        观察宿主属性结果
      </Button>
      <Button
        disabled={busy || !config.appUuid}
        onClick={() => run(() => getAppByUuid(configured(config.appUuid, 'appUuid')))}
      >
        查询平台数据
      </Button>
      <Button
        disabled={busy || !config.parentDictCode}
        onClick={() => run(() => getDictionaryValues(configured(config.parentDictCode, 'parentDictCode')))}
      >
        查询字典
      </Button>
      <Button
        disabled={busy || !config.externalApi}
        onClick={() => run(() => executeApiCall(configured(config.externalApi, 'externalApi')))}
      >
        平台代调外部接口
      </Button>
      <Button
        disabled={busy || !config.visualAngle}
        onClick={() => run(() => setVisualAngle(configured(config.visualAngle, 'visualAngle')))}
      >
        执行视角接口示例
      </Button>
      <Button
        disabled={busy || !config.elementTarget || !config.appearance}
        onClick={() =>
          run(() =>
            setElementAppearance(
              configured(config.elementTarget, 'elementTarget'),
              configured(config.appearance, 'appearance'),
            ),
          )
        }
      >
        设置构件外观
      </Button>
      <Button
        disabled={busy || !config.elementTarget}
        onClick={() => run(() => resetElementAppearance(configured(config.elementTarget, 'elementTarget')))}
      >
        恢复指定构件属性
      </Button>
      <Button
        disabled={busy || !config.linkedElementIds || !config.linkedElementAccess}
        onClick={() =>
          run(() => {
            setLinkedElementsVisible(
              !linkedVisible,
              configured(config.linkedElementIds, 'linkedElementIds'),
              configured(config.linkedElementAccess, 'linkedElementAccess'),
            )
            setLinkedVisible(!linkedVisible)
          })
        }
      >
        切换联动元素显隐
      </Button>
      <Button disabled={busy || listening} onClick={() => run(startSelection)}>
        开始监听选择
      </Button>
      <Button disabled={busy || !listening} onClick={() => run(stopListening)}>
        停止监听
      </Button>
      <Input.TextArea value={output} readOnly aria-label='能力执行结果' style={{ height: 200 }} />
    </section>
  )
}
