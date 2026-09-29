import { ValidationError } from 'class-validator';

const TYPE_CONSTRAINTS: Record<string, string> = {
  isString: 'string',
  isNumber: 'number',
  isInt: 'integer',
  isBoolean: 'boolean',
  isArray: 'array',
  isObject: 'object',
};

function isRequiredFailure(error: ValidationError): boolean {
  const keys = Object.keys(error.constraints ?? {});
  return (
    keys.includes('isDefined') ||
    keys.includes('isNotEmpty') ||
    (keys.includes('isString') &&
      (error.value === undefined || error.value === null))
  );
}

function mapConstraints(
  error: ValidationError,
  fullPath: string,
  parentPath: string,
): string[] {
  const { property, constraints, value } = error;
  const messages: string[] = [];

  if (isRequiredFailure(error)) {
    if (parentPath) {
      messages.push(`data.${parentPath} should have required property '${property}'`);
    } else {
      messages.push(`data should have required property '${property}'`);
    }
    return messages;
  }

  for (const key of Object.keys(constraints ?? {})) {
    const ajvType = TYPE_CONSTRAINTS[key];
    if (ajvType) {
      messages.push(`data.${fullPath} should be ${ajvType}`);
      continue;
    }

    if (constraints?.[key]) {
      messages.push(`data.${fullPath} ${constraints[key]}`);
    }
  }

  if (messages.length === 0 && value !== undefined) {
    messages.push(`data.${fullPath} is invalid`);
  }

  return messages;
}

export function formatValidationErrors(errors: ValidationError[]): string {
  const messages: string[] = [];

  const walk = (items: ValidationError[], parentPath = '') => {
    for (const error of items) {
      const fullPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        messages.push(...mapConstraints(error, fullPath, parentPath));
      }

      if (error.children?.length) {
        walk(error.children, fullPath);
      }
    }
  };

  walk(errors);
  return messages.join(', ');
}
