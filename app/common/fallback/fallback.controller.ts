import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

@Controller()
export class FallbackController {
  constructor(private readonly configService: ConfigService) {}

  @Get('*')
  fallback(@Res() res: { redirect: (status: number, url: string) => void }): void {
    const homePage = this.configService.get('homePage') as string | undefined;
    res.redirect(302, `${homePage ?? '/'}`);
  }
}
