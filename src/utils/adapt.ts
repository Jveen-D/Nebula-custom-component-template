export function adaptDataSetAndResId(dataSetId: string) {
  // 做一个适配，背景，引擎升级 3.0 之后，弃用 resId 改用 dataSetId , dataSetId 是带横杠的， resId 是不带横杠的，而我们之前 2.0的代码，是用 res去加载的...没有改过来，这里做个适配
  const allDataSetIds = window.BlackHole3D.Model.getAllDataSetId()
  const adapt = allDataSetIds.find(e => e === dataSetId.replaceAll('-', ''))
  if (adapt) return adapt
  return dataSetId
}
