import React from 'react';
import useStyles from './styles';
import type { HostComponentProps } from '../capabilities/host/props';

// 兼容旧模块的具名导出；新代码请直接从 capabilities/platform/requests 导入。
export { getAppByUuid } from '../capabilities/platform/requests';

const Component: React.FC<HostComponentProps> = (props) => {
  const { styles } = useStyles();
  return <div className={styles.Wrapper}>
    {/* 业务 UI 开发入口：按需读取 props，并从 capabilities 组合所需能力。 */}
  </div>;
};

export default Component;
