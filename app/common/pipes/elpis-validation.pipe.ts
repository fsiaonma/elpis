import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { formatValidationErrors } from './format-validation-errors';

export function createElpisValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    validationError: {
      target: false,
      value: false,
    },
    exceptionFactory: (errors) =>
      new HttpException(
        {
          success: false,
          code: 442,
          message: `request validate fail: ${formatValidationErrors(errors)}`,
        },
        HttpStatus.OK,
      ),
  });
}
