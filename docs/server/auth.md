# 鉴权与 Guard

框架只负责接口签名（防篡改、防重放），**用户登录态由业务实现**。推荐做法是：全局 Guard + `@Public()` 装饰器。

## 1. `@Public()` 装饰器

```ts
// app/modules/auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

## 2. 全局 Guard

下面的 Guard 从 cookie 读取 JWT：接口未登录返回 JSON 错误，页面未登录 302 到登录页。

```ts
// app/modules/auth/auth-token.guard.ts
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@fsiaonma/elpis/nest';
import type { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from './public.decorator';

const WHITE_LIST = ['/view/auth/login', '/api/auth/login', '/api/auth/logout'];

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    if (WHITE_LIST.includes(req.path)) return true;

    const token = readCookie(req, 'token');
    try {
      const secret = this.configService.get('jwtSecretKey') as string;
      const { userId } = jwt.verify(token ?? '', secret) as { userId: string };
      (req as Request & { userId?: string }).userId = userId;
      return true;
    } catch {
      res.cookie('token', '', { expires: new Date(0) });
      const url = req.originalUrl || req.url;

      if (url.includes('api')) {
        // 接口：返回统一 JSON，前端 $curl 会弹出 message
        throw new HttpException(
          { success: false, code: 50000, message: '请重新登录' },
          HttpStatus.OK,
        );
      }

      // 页面：重定向到登录页；302 会被全局异常过滤器忽略
      res.redirect(302, `/view/auth/login?callback=${url}`);
      throw new HttpException('', HttpStatus.FOUND);
    }
  }
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  const hit = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}
```

## 3. 注册为全局 Guard

```ts
// app/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthTokenGuard } from './auth-token.guard';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    AuthTokenGuard,
    { provide: APP_GUARD, useExisting: AuthTokenGuard },
  ],
})
export class AuthModule {}
```

## 4. 登录接口

```ts
import { Body, Controller, Post, Res } from '@nestjs/common';
import { BaseController, ConfigService } from '@fsiaonma/elpis/nest';
import type { Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController extends BaseController {
  constructor(private readonly config: ConfigService, private readonly userService: UserService) {
    super();
  }

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.userService.verify(dto.username, dto.password);
    if (!user) return this.fail('用户名或密码错误', 50000);

    const token = jwt.sign({ userId: user.user_id }, this.config.get('jwtSecretKey') as string, {
      expiresIn: 7 * 24 * 3600,
    });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    return this.success();
  }
}
```

> 业务 Guard 与框架的 `ApiSignGuard` 相互独立：一个接口通常同时需要「签名正确」和「已登录」。白名单要分别配置：签名白名单在 `apiSignVerify.whiteList`，登录白名单在业务 Guard 里。

## 其他场景

- **角色权限**：再写一个 `@Roles('admin')` 装饰器 + `RolesGuard`，用法同上
- **只对部分模块鉴权**：不使用 `APP_GUARD`，改为在 Controller 上 `@UseGuards(AuthTokenGuard)`
- **调用方是服务端**：用 Header token 代替 cookie，并在 Guard 中按路径前缀区分
