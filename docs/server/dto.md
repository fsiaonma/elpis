# DTO 与参数校验

Elpis 全局启用了 `ValidationPipe`，业务只需用 [class-validator](https://github.com/typestack/class-validator) 声明 DTO。

## 声明 DTO

```ts
// dto/create-product.dto.ts
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(3, 10)
  product_name!: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(1000)
  price?: number;

  @IsOptional()
  @IsNumber()
  inventory?: number;
}
```

```ts
// dto/get-product-list.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetProductListDto {
  @IsOptional()
  @IsString()
  product_name?: string;

  @IsInt()
  @Min(1)
  page!: number;   // query 里是字符串 "1"，隐式转换后得到数字

  @IsInt()
  size!: number;
}
```

## 使用

```ts
@Post()
create(@Body() dto: CreateProductDto) {}

@Get('list')
list(@Query() dto: GetProductListDto) {}
```

## 全局行为

| 选项 | 效果 |
| --- | --- |
| `whitelist: true` | 请求里 DTO 没声明的字段会被**静默剔除**。字段要用，就必须在 DTO 中声明并加至少一个装饰器 |
| `transform: true` | 参数会被转成 DTO 类实例 |
| `enableImplicitConversion` | 按 TS 类型自动转换，例如 query `?page=2` → `2` |

> `whitelist` 会剔除没有任何装饰器的属性。只需要透传的字段可以加 `@IsOptional()`。

## 失败响应

```json
{
  "success": false,
  "code": 442,
  "message": "request validate fail: data should have required property 'product_name', data.price should be number"
}
```

错误信息格式与前端 `schema-form` 的 Ajv 风格保持一致，便于前后端统一提示。

## 嵌套对象

```ts
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

class AddressDto {
  @IsString()
  city!: string;
}

export class CreateShopDto {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}
```

失败信息形如 `data.address should have required property 'city'`。

## 与前端 schema 对齐

`model` 配置中的 JSON Schema 约束会在前端 `schema-form` 中用 Ajv 校验一次，后端 DTO 再校验一次。推荐让两者保持一致：

| model schema | DTO |
| --- | --- |
| `type: 'string'` | `@IsString()` |
| `type: 'number'` | `@IsNumber()` |
| `minLength` / `maxLength` | `@Length(min, max)` |
| `minimum` / `maximum` | `@Min()` / `@Max()` |
| `pattern` | `@Matches(/.../)` |
| `required: ['key']` | 不加 `@IsOptional()` |
