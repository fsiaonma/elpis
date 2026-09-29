import { Injectable } from '@nestjs/common';
import { ModelItem, ModelService } from './model.service';

@Injectable()
export class ProjectService {
  constructor(private readonly modelService: ModelService) {}

  get(projKey: string) {
    let projConfig: Record<string, unknown> | undefined;

    this.modelService.getModelList().forEach((modelItem: ModelItem) => {
      if (modelItem.project?.[projKey]) {
        projConfig = modelItem.project[projKey];
      }
    });

    return projConfig;
  }

  getList({ projKey }: { projKey?: string }) {
    return this.modelService.getModelList().reduce<
      Record<string, unknown>[]
    >((preList: Record<string, unknown>[], modelItem: ModelItem) => {
      const { project } = modelItem;

      if (projKey && !project?.[projKey]) {
        return preList;
      }

      for (const pKey in project) {
        preList.push(project[pKey]);
      }

      return preList;
    }, []);
  }

  async getModelList() {
    return this.modelService.getModelList();
  }
}
