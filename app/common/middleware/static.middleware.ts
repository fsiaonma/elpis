import { INestApplication } from '@nestjs/common';
import express from 'express';
import * as path from 'path';

export function applyStaticAssets(app: INestApplication): void {
  const frameworkPublic = path.resolve(__dirname, '..', '..', '..', 'app', 'public');
  const businessPublic = path.resolve(process.cwd(), 'app', 'public');
  const httpApp = app.getHttpAdapter().getInstance() as {
    use: (...handlers: unknown[]) => unknown;
  };

  httpApp.use(express.static(frameworkPublic, { fallthrough: true, redirect: false }));
  httpApp.use(express.static(businessPublic, { fallthrough: true, redirect: false }));
}
