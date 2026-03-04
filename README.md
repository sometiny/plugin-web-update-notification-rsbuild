# plugin-web-update-notification-rsbuild

基于项目：https://github.com/GreatAuk/plugin-web-update-notification

用于Rsbuild检测网页更新并通知用户刷新。
## 安装

```bash
npm i plugin-update-notification-rsbuild -D
```
## 使用
基于plugin-web-update-notification，参数配置完全一致。
```ts
import { webUpdateNotice } from 'plugin-web-update-notification-rsbuild';

export default defineConfig({
  plugins: [
    ...,
    webUpdateNotice({
      ...
    })
  ],
  ...
});
```
## License

[MIT](./LICENSE)
