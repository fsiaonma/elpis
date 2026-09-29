import { OptionalString } from '../../../common/dto';

export class GetListDto {
  @OptionalString()
  proj_key?: string;
}
