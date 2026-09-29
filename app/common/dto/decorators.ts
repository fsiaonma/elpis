import { applyDecorators } from '@nestjs/common';
import { IsDefined, IsOptional, IsString } from 'class-validator';

/** router-schema required string field → query/body DTO */
export function RequiredString(): PropertyDecorator {
  return applyDecorators(IsDefined(), IsString());
}

/** router-schema optional string field → query/body DTO */
export function OptionalString(): PropertyDecorator {
  return applyDecorators(IsOptional(), IsString());
}
