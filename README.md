# 营业额记录 (sales-tracker)

记录每日营业额的 Android 应用，基于 Vite + React 18 + TypeScript + MUI v5 + Tailwind CSS，通过 Capacitor 打包为 APK。

## 功能
- 添加商品（名称/数量/单价/总价），数量带 ±1 按钮，总价可自动联动（单价×数量）也可手动修改
- 月度统计图表（Recharts）
- 导出 Excel（SheetJS）
- 常用商品快捷选择（自动补全 + 收藏）
- localStorage 本地持久化，离线可用

## 开发
```bash
npm install
npm run dev      # 本地开发
npm test         # 运行测试（185 个用例）
npm run build    # 构建产物
```

## 打包 Android APK
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```
