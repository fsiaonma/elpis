import { Controller, Get, Query } from '@nestjs/common';
import { BaseController } from '../../common/base/base.controller';
import { GetListDto } from './dto/get-list.dto';
import { GetProjectDto } from './dto/get-project.dto';
import { ModelItem } from './model.service';
import { ProjectService } from './project.service';

@Controller('api/project')
export class ProjectController extends BaseController {
  constructor(private readonly projectService: ProjectService) {
    super();
  }

  @Get()
  get(@Query() query: GetProjectDto) {
    const projConfig = this.projectService.get(query.proj_key);

    if (!projConfig) {
      return this.fail('获取项目异常', 50000);
    }

    return this.success(projConfig);
  }

  @Get('list')
  getList(@Query() query: GetListDto) {
    const projectList = this.projectService.getList({ projKey: query.proj_key });

    const dtoProjectList = projectList.map((item) => {
      const { modelKey, key, name, desc, homePage } = item as {
        modelKey: string;
        key: string;
        name: string;
        desc: string;
        homePage: string;
      };
      return { modelKey, key, name, desc, homePage };
    });

    return this.success(dtoProjectList);
  }

  @Get('model_list')
  async getModelList() {
    const modelList = await this.projectService.getModelList();

    const dtoModelList = modelList.reduce<
      {
        model: { key: string; name: string; desc: string };
        project: Record<
          string,
          { key: string; name: string; desc: string; homePage: string }
        >;
      }[]
    >((preList, item: ModelItem) => {
      const { model, project } = item;

      const { key, name, desc } = model as {
        key: string;
        name: string;
        desc: string;
      };
      const dtoModel = { key, name, desc };

      const dtoProject = Object.keys(project ?? {}).reduce<
        Record<string, { key: string; name: string; desc: string; homePage: string }>
      >((preObj, projKey) => {
        const { key, name, desc, homePage } = project![projKey] as {
          key: string;
          name: string;
          desc: string;
          homePage: string;
        };
        preObj[projKey] = { key, name, desc, homePage };
        return preObj;
      }, {});

      preList.push({
        model: dtoModel,
        project: dtoProject,
      });

      return preList;
    }, []);

    return this.success(dtoModelList);
  }
}
