# $curl 请求封装

`$curl` 基于 axios，自动处理接口签名、`proj_key` 与统一错误提示。业务页面调用后端接口都应使用它。

```js
import $curl from '$elpisCurl';
```

## 参数

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `url` | — | 请求地址 |
| `method` | `'post'` | `get` / `post` / `put` / `delete` |
| `query` | `{}` | URL 参数 |
| `data` | `{}` | 请求体 |
| `headers` | `{}` | 额外请求头 |
| `responseType` | `'json'` | 同 axios |
| `timeout` | `60000` | 超时毫秒 |
| `errorMessage` | `'网络异常'` | 未识别错误码时的提示 |

## 返回值

`$curl` **永远 resolve**，不会 reject，调用方只需判断 `success`：

```js
const res = await $curl({ method: 'get', url: '/api/proj/product/list', query: { page: 1, size: 20 } });

if (!res?.success) return;          // 失败时已自动弹出提示
const { data, metadata } = res;     // metadata.total ...
```

| 情况 | 返回 |
| --- | --- |
| 成功 | `{ success: true, data, metadata }` |
| 业务失败 | `{ success: false, code, message }` |
| 超时 | `{ code: 504, message: 'Request Timeout' }` |
| 网络错误 | axios error 对象 |

## 自动处理

- **签名**：为每个请求添加 `s_t`、`s_sign` 请求头，见 [请求链路](#server/pipeline.md)
- **proj_key**：URL 包含 `/api/proj/` 且 `window.projKey` 存在时，自动添加 `proj_key` 请求头
- **错误提示**：

| code | 提示 |
| --- | --- |
| `442` | 请求参数异常 |
| `445` | 请求不合法 |
| `446` | 缺少项目必要参数 |
| `50000` | 服务端返回的 `message` |
| 其他 | `errorMessage` |

## 常用写法

```js
// 列表
await $curl({ method: 'get', url: '/api/proj/product/list', query: { page: 1, size: 50 } });

// 新增
await $curl({ method: 'post', url: '/api/proj/product', data: { product_name: 'Elpis' } });

// 修改
await $curl({ method: 'put', url: '/api/proj/product', data: { product_id: '1', price: 99 } });

// 删除（DELETE 也通过 data 传 body）
await $curl({ method: 'delete', url: '/api/proj/product', data: { product_id: '1' }, errorMessage: '删除失败' });

// 下载
const res = await $curl({ method: 'get', url: '/api/report/export', responseType: 'blob' });
```

## 不使用 $curl 时

`fetch`（例如 SSE 流式请求）或上传等场景，需要自己带签名头。签名算法为 `md5(`${SIGN_KEY}_${timestamp}`)`，`SIGN_KEY` 与框架 `app/pages/common/curl.js` 保持一致：

```js
import md5 from 'md5';

export function buildSignedHeaders(extra = {}) {
  const st = Date.now();
  return {
    ...extra,
    s_t: String(st),
    s_sign: md5(`${SIGN_KEY}_${st}`),
    ...(window.projKey ? { proj_key: window.projKey } : {}),
  };
}
```

流式请求的完整示例见 [HTTP 与流式接口](#ai/api.md)。
