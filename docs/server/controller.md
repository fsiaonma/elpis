# Module 与 Controller

业务后端就是标准的 NestJS 模块，Elpis 负责发现并加载它们。

## 模块发现规则

框架启动时扫描 `dist/modules/**/*.module.js`：

- 文件名必须以 `.module.js` 结尾（源码 `xxx.module.ts`）
- 文件中**导出的、类名以 `Module` 结尾**的类会被注册
- 无需在任何地方 `import` 它，也不用改框架代码

```ts
// app/modules/product/product.module.ts
import { Module } from '@nestjs/common';
import { ProductController, ProductEnumController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController, ProductEnumController],
  providers: [ProductService],
})
export class ProductModule {}
```

## BaseController

继承 `BaseController` 后可以用两个方法输出统一格式：

```ts
this.success(data, metadata?)  // { success: true, data, metadata }
this.fail(message, code)       // { success: false, message, code }
```

`metadata` 常用于分页：`schema-table` 读取 `metadata.total` 渲染分页器。

## 一个完整的 CRUD Controller

以下 Controller 正好满足 [schema-view](#frontend/schema-view.md) 的接口约定，配上一份 `schemaConfig` 就能得到完整的管理页。

```ts
import { Body, Controller, Delete, Get, Post, Put, Query, Req } from '@nestjs/common';
import { BaseController } from '@fsiaonma/elpis/nest';
import type { Request } from 'express';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RemoveProductDto } from './dto/remove-product.dto';
import { GetProductDto } from './dto/get-product.dto';
import { GetProductListDto } from './dto/get-product-list.dto';
import { ProductService } from './product.service';

type ProjRequest = Request & { projKey: string };

@Controller('api/proj/product')
export class ProductController extends BaseController {
  constructor(private readonly productService: ProductService) {
    super();
  }

  // 新增：createForm 提交
  @Post()
  async create(@Body() dto: CreateProductDto) {
    return this.success(await this.productService.create(dto));
  }

  // 修改：editForm 提交
  @Put()
  async update(@Body() dto: UpdateProductDto) {
    return this.success(await this.productService.update(dto));
  }

  // 删除：表格行按钮 eventKey: 'remove'
  @Delete()
  async remove(@Body() dto: RemoveProductDto, @Req() req: ProjRequest) {
    return this.success(await this.productService.remove(req.projKey, dto.product_id));
  }

  // 单条：editForm / detailPanel 回填
  @Get()
  async get(@Query() dto: GetProductDto, @Req() req: ProjRequest) {
    return this.success(await this.productService.get(req.projKey, dto.product_id));
  }

  // 列表：schema-table 分页
  @Get('list')
  async list(@Query() dto: GetProductListDto, @Req() req: ProjRequest) {
    const { list, total, page, size } = await this.productService.getList(req.projKey, dto);
    return this.success(list, { total, page, size });
  }
}
```

一个文件可以放多个 Controller，例如给搜索栏 `dynamicSelect` 提供枚举：

```ts
@Controller('api/proj/product_enum')
export class ProductEnumController extends BaseController {
  constructor(private readonly productService: ProductService) {
    super();
  }

  @Get('list')
  list(@Req() req: ProjRequest) {
    // 返回 [{ label, value }]
    return this.success(this.productService.getProductEnumList(req.projKey));
  }
}
```

## 路由前缀约定

| 前缀 | 签名校验 | proj_key | 适用 |
| --- | --- | --- | --- |
| `api/proj/*` | ✓ | 必须 | 与具体项目相关的数据接口 |
| `api/*` | ✓ | — | 全局接口，如登录、用户 |
| `view/*` | — | — | 框架页面渲染，业务不要占用 |
| 其他 | — | — | 回调、健康检查等 |

## 获取 Request / Response

```ts
import { Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

@Get('download')
download(@Res() res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.send('id,name\n1,elpis');
}
```

> 在 `tsconfig.include` 里加入 `node_modules/@fsiaonma/elpis/app/types/express.d.ts`，即可在 `Request` 上获得 `projKey`、`userId` 等字段的类型提示。也可以在业务里自行 `declare module 'express'` 扩展。
