const Ajv = require('ajv');
const ajv = new Ajv();

/**
 * API 参数校验
 */
module.exports = (app) => {
  const $schema = 'http://json-schema.org/draft-07/schema#';
	return async (ctx, next) => {
		// 只对 API 参数校验
		if (ctx.path.indexOf('/api/') < 0) {
			return await next();
		}

		// 获取请求参数
		const { body, query, headers } = ctx.request;
		const { params, path, method } = ctx;

		app.logger.info(`[${method} ${path}] body: ${JSON.stringify(body)}`);
		app.logger.info(`[${method} ${path}] query: ${JSON.stringify(query)}`);
		app.logger.info(`[${method} ${path}] params: ${JSON.stringify(params)}`);
		app.logger.info(`[${method} ${path}] headers: ${JSON.stringify(headers)}`);

		const schema = app.routerSchema[path]?.[method.toLowerCase()];

		if (!schema) {
			return await next();
		}

		let valid = true;

		// ajv 校验器
		let validate;

		// 校验 headers
		if (valid && headers && schema.headers) {
			schema.headers.$schema = $schema;
			validate = ajv.compile(schema.headers);
			valid = validate(headers);
		}

		// 校验 body
		if (valid && body && schema.body) {
			schema.body.$schema = $schema;
			validate = ajv.compile(schema.body);
			valid = validate(body);
		}

		// 校验 query
		if (valid && query && schema.query) {
			schema.query.$schema = $schema;
			validate = ajv.compile(schema.query);
			valid = validate(query);
		}

		// 校验 params
		if (valid && params && schema.params) {
			schema.params.$schema = $schema;
			validate = ajv.compile(schema.params);
			valid = validate(params);
		}

		if (!valid) {
			ctx.status = 200;
			ctx.body = {
				success: false,
				message: `request validate fail: ${ajv.errorsText(validate.errors)}`,
				code: 442
			}
			return;	
		}

		await next();
	}
}