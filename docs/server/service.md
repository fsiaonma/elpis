# Service 与 Provider

Service 是标准的 Nest `@Injectable()` Provider，用来放业务逻辑、访问数据库与外部服务。

## 基础 Service

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductService {
  async getList(projKey: string, { page, size }: { page: number; size: number }) {
    const list = [{ product_id: '1', product_name: `${projKey} - Elpis 实战`, price: 39.9 }];
    return { list, total: list.length, page, size };
  }
}
```

在 Module 的 `providers` 中声明后即可通过构造函数注入：

```ts
@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService], // 需要被其他模块使用时导出
})
export class ProductModule {}
```

## 访问数据库：DatabaseProvider

框架内置 `ExtendModule`，提供基于 [knex](https://knexjs.org/) 的 `DatabaseProvider`。

**1. 配置连接**

```js
// config/config.local.js
module.exports = {
  db: {
    client: 'mysql2',
    connection: {
      host: 'localhost',
      port: '3306',
      database: 'my_db',
      user: 'root',
      password: 'your-password',
    },
    pool: { min: 5, max: 20 },
  },
};
```

业务仓库需要安装对应驱动：`npm install mysql2`。

**2. 引入 ExtendModule**

```ts
import { Module } from '@nestjs/common';
import { ExtendModule } from '@fsiaonma/elpis/nest';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [ExtendModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

**3. 在 Service 中使用**

```ts
import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '@fsiaonma/elpis/nest';

@Injectable()
export class UserService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  private get db() {
    return this.databaseProvider.db!; // 未配置 db 时为 undefined
  }

  async getList({ page, size, nickname }: { page: number; size: number; nickname?: string }) {
    const query = this.db('t_user').where('status', 1);
    if (nickname) query.andWhere('nickname', 'like', `%${nickname}%`);

    const [{ count }] = await query.clone().count({ count: '*' });
    const list = await query
      .select('user_id', 'username', 'nickname', 'create_time')
      .orderBy('create_time', 'desc')
      .offset((page - 1) * size)
      .limit(size);

    return { list, total: Number(count) };
  }

  async create(user: { username: string; nickname?: string }) {
    await this.db('t_user').insert({ ...user, status: 1 });
  }

  async remove(userId: string) {
    // 软删除
    return this.db('t_user').where('user_id', userId).update({ status: -1 });
  }
}
```

## 读取配置：ConfigService

`ConfigService` 是全局 Provider，任何地方都可以直接注入，无需 import 模块：

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@fsiaonma/elpis/nest';

@Injectable()
export class SmsService {
  constructor(private readonly config: ConfigService) {}

  send(phone: string) {
    const { endpoint, appKey } = this.config.get('sms') as { endpoint: string; appKey: string };
    // ...
  }
}
```

详见 [配置](#guide/config.md)。

## 自定义 Provider

常量、枚举等也可以做成 Provider，便于注入与测试：

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class StatusProvider {
  readonly NORMAL = 1;
  readonly DELETE = -1;
}
```

```ts
@Module({
  imports: [ExtendModule],
  providers: [UserService, StatusProvider],
})
export class UserModule {}

@Injectable()
export class UserService {
  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly status: StatusProvider,
  ) {}
}
```

## 跨模块复用

```ts
// auth.module.ts
@Module({
  imports: [UserModule],   // UserModule 中 exports: [UserService]
  controllers: [AuthController],
})
export class AuthModule {}

// auth.controller.ts
constructor(private readonly userService: UserService) { super(); }
```

## 日志

`ExtendModule` 内置 `LoggerProvider`：`_ENV=local` 时为 `console`，其他环境为 log4js，输出到控制台与 `./logs/application.log`（按天切分）。框架内部的请求、异常日志都会写入这里。

> `LoggerProvider` 目前没有从 `@fsiaonma/elpis/nest` 导出，业务侧可直接使用 `console` 或自建 log4js 实例。

## 生命周期钩子

需要在启动时做初始化（例如注册 AI 工具、预热缓存）时，实现 Nest 生命周期接口：

```ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class WarmupService implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    // 所有模块初始化完成后执行
  }
}
```

[Tool 注册](#ai/tool.md) 就是基于这个钩子实现的。
