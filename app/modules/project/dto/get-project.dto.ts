import { RequiredString } from '../../../common/dto';

export class GetProjectDto {
  @RequiredString()
  proj_key!: string;
}
