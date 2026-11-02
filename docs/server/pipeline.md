# 请求链路与错误码

<img src="assets/request-pipeline.svg" alt="请求链路" />

`serverStart()` 启动时，框架在 Nest 应用上挂了四个全局组件，业务代码无需注册：

| 组件 | 作用 | 生效范围 |
| --- | --- | --- |
| `ApiSignGuard` | 校验请求签名 | 路径包含 `/api`，且不在白名单 |
| `ProjKeyInterceptor` | 读取 `proj_key` 请求头注入 `req.projKey` | 路径包含 `/api/proj/` |
| `ValidationPipe` | DTO 校验、类型转换、剔除未声明字段 | 所有带 DTO 的参数 |
| `AllExceptionsFilter` | 统一异常响应 | 全局 |

此外还会把框架与业务仓库的 `app/public` 目录挂为静态资源，例如 `app/public/static/logo.png` 可通过 `/static/logo.png` 访问。

## 接口签名

所有路径包含 `/api` 的请求必须携带两个请求头：

| 请求头 | 值 |
| --- | --- |
| `s_t` | 当前毫秒时间戳 |
| `s_sign` | `md5(`${SIGN_KEY}_${s_t}`)` |

- 时间戳与服务端相差超过 **10 分钟**（600000ms）视为过期
- 校验失败返回 `{ success: false, code: 445, message: 'signature not correct or api timeout!!' }`
- 前端 `$curl` 已自动签名；`SIGN_KEY` 与框架 `app/pages/common/curl.js` 中保持一致

服务端脚本（例如评测脚本）调用接口时，自己生成签名头：

```js
const md5 = require('md5');

function buildSignHeaders(signKey) {
  const st = Date.now();
  return { s_t: String(st), s_sign: md5(`${signKey}_${st}`) };
}
```

### 签名白名单

第三方回调、登出等不方便签名的接口，加入白名单（精确匹配 `req.path`）：

```js
// config/config.default.js
module.exports = {
  apiSignVerify: {
    whiteList: ['/api/auth/logout', '/api/pay/notify'],
  },
};
```

## 多项目：proj_key

Elpis 天然支持「一套代码，多个项目」（见 [model 与 project](#frontend/model.md)）。路径包含 `/api/proj/` 的接口会被视为**项目级接口**：

- 必须带请求头 `proj_key`，否则返回 `{ success: false, code: 446, message: 'proj_key not found' }`
- 通过后在 Controller 里用 `req.projKey` 拿到当前项目

```ts
import { Controller, Get, Req } from '@nestjs/common';
import { BaseController } from '@fsiaonma/elpis/nest';
import type { Request } from 'express';

@Controller('api/proj/order')
export class OrderController extends BaseController {
  @Get('list')
  list(@Req() req: Request & { projKey: string }) {
    return this.success([], { total: 0, projKey: req.projKey });
  }
}
```

前端页面的 URL 带 `proj_key` 时，渲染模板会把它写入 `window.projKey`，`$curl` 请求 `/api/proj/*` 时自动带上请求头。

## 参数校验

全局 `ValidationPipe` 配置为：

```ts
new ValidationPipe({
  whitelist: true,                       // 剔除 DTO 未声明的字段
  transform: true,                       // 转换为 DTO 实例
  transformOptions: { enableImplicitConversion: true }, // query 中的 "1" → 1
});
```

校验失败统一返回：

```json
{ "success": false, "code": 442, "message": "request validate fail: data should have required property 'product_name'" }
```

详见 [DTO 与参数校验](#server/dto.md)。

## 异常处理

| 抛出 | 返回 |
| --- | --- |
| `HttpException`，响应体是含 `code` 的对象 | 原样返回该对象，HTTP 状态码沿用 |
| `HttpException` 状态为 `403` / `302` | 不处理（交给 Guard 已经写好的响应，例如重定向） |
| 渲染页面时模板不存在 | 302 重定向到 `homePage` |
| 其他任何错误 | `{ succes: false, code: 50000, message: '网络异常 请稍后重试' }`，并记录日志 |

因此业务里推荐用下面方式返回可读的错误：

```ts
import { HttpException, HttpStatus } from '@nestjs/common';

throw new HttpException(
  { success: false, code: 40001, message: '库存不足' },
  HttpStatus.OK,
);
```

或在 Controller 里直接 `return this.fail('库存不足', 40001)`。

## 错误码一览

| code | 来源 | 前端 `$curl` 提示 |
| --- | --- | --- |
| `442` | 参数校验失败 | 请求参数异常 |
| `445` | 签名失败 / 过期 | 请求不合法 |
| `446` | 缺少 `proj_key` | 缺少项目必要参数 |
| `50000` | 未捕获异常 / 业务自定义 | 直接展示 `message` |
| `40401` | AI：Agent 或 Trace 不存在 | 使用 `errorMessage` |
| `504` | 前端请求超时 | — |
