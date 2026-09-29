import { Injectable } from '@nestjs/common';
import { createRequire } from 'module';

const runtimeRequire = createRequire(__filename);

export type ModelItem = {
  model?: Record<string, unknown> & { key?: string };
  project?: Record<string, Record<string, unknown> & { key?: string; modelKey?: string }>;
};

export type ModelList = ModelItem[];

function loadModelList(app: Record<string, unknown>): ModelList {
  const load = runtimeRequire('../../../model/index.js') as (
    app: Record<string, unknown>,
  ) => ModelList;
  return load(app);
}

@Injectable()
export class ModelService {
  private readonly modelList: ModelList;

  constructor() {
    this.modelList = loadModelList({});
  }

  getModelList(): ModelList {
    return this.modelList;
  }
}
