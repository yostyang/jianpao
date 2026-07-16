# 简跑

简约的跑步记录 App:导入手表的 FIT 文件,本地查看轨迹、配速、心率和跑量统计。本地优先 —— 所有数据只存在你的设备上。

Expo (React Native + TypeScript) 构建,一套代码同时跑 iOS / Android / Web。

## 当前功能(v0.1)

- **FIT 导入**:支持佳明 / 高驰 / 华米 / 华为等手表导出的 `.fit` 文件,多选批量导入,按文件哈希 + 开始时间自动去重
- **活动列表**:按月分组,显示距离、时长、配速(骑行显示时速)、心率
- **活动详情**:GPS 轨迹地图(iOS 开发构建用 Apple 地图,标准/卫星切换,已做 WGS-84→GCJ-02 纠偏;Expo Go / Web / Android 回退无底图 SVG),轨迹按配速渐变着色;配速 / 心率 / 步频 / 海拔曲线(距离轴 + 均值虚线)、心率训练区间(Z1–Z5)、每公里分段(配速 / 心率 / 爬升)、步幅 / METs 强度 / 卡路里食物换算等指标、起点地区(逆地理编码,坐标模糊到 ~1km 后查询)
- **统计**:周 / 月 / 年三档视图,跑量柱状图、日历热力图、年度月均与最佳月份、个人纪录(最快 1/5/10 公里、最长距离与时长)
- **账号绑定**:适配器框架已就绪,各平台按资质逐步点亮(见路线图)

## 开发运行

```bash
npm install
npx expo start        # 真机预览(推荐)
npx expo start --web  # 浏览器预览
```

**手机真机预览**:手机装 [Expo Go](https://expo.dev/go)(App Store / 应用商店搜 Expo Go),和电脑连同一 Wi-Fi,扫 `npx expo start` 终端里的二维码即可。导入 FIT 用手机文件 App 选择手表导出的 `.fit` 文件。

**iOS 开发构建(带地图,需 Xcode)**:装好 Xcode 后执行 `npx expo run:ios --device` 直接装到 iPhone(或去掉 `--device` 跑模拟器)。Expo Go 里地图会自动回退为 SVG 轨迹,只有开发构建能显示 Apple 地图。

**FIT 解析冒烟测试**(不启动 App,直接在 Node 里验证解析结果):

```bash
node scripts/parse-fit.mjs /path/to/Running_xxx.fit
```

## 项目结构

```
src/
├── app/                  expo-router 页面
│   ├── (tabs)/           活动列表 / 统计 / 我的
│   └── activity/[id]     活动详情
├── fit/parser.ts         FIT → 内部模型(纯 TS,Node/RN/Web 通用)
├── store/                本地存储:原生 SQLite+文件,Web IndexedDB
├── sync/                 同步框架:SyncProvider 适配器 + registry
├── components/           TrackSvg / LineChart / BarChart / SplitsTable / Heatmap ...
└── lib/                  导入流程、hooks、降采样等
```

## 路线图

- **Phase 2 — Strava 绑定**:在 [strava.com/settings/api](https://www.strava.com/settings/api) 免费申请一个 API Client(当天可拿到 Client ID/Secret),即可实现 OAuth 绑定 + 自动同步。Garmin / COROS / 华为手表都支持自动同步到 Strava,绑定它等于间接覆盖大部分手表。
- **Phase 3 — 更多平台**:Garmin Connect API / COROS 开放 API / 华为 Health Kit 均需开发者资质,申请通过后在 `src/sync/providers/` 各加一个实现文件即可点亮。华米 Zepp / Keep / 小米 / OPPO / vivo 暂无正式开放 API,推荐「导出 FIT → 导入」或经 Strava 中转。
- 打安装包走 EAS 云构建(本机无需 Xcode / Android SDK):`npx eas build`。

## 数据与隐私

- 活动元数据存 SQLite(Web 端 IndexedDB),逐秒采样点按活动存 JSON 文件,详情页按需加载
- 无任何服务端,数据不出设备
- `public/testdata/` 是本地调试用的私人 FIT 数据,已加入 `.gitignore`
