export class BaseController {
  protected success(data: unknown = {}, metadata: Record<string, unknown> = {}) {
    return {
      success: true,
      data,
      metadata,
    };
  }

  protected fail(message: string, code: number) {
    return {
      success: false,
      message,
      code,
    };
  }
}
