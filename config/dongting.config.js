module.exports = {
  buildConfig: {
    entry: './src/index.tsx', // 主入口
    disableCssExtract: true,
    publicPath: '/',
    port: 5010 // 子应用启动的端口
  }
}
