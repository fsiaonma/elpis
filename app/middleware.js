const path = require('path');

module.exports = (app) => {
	// 配置静态根目录
	const koaStatic = require('koa-static');
  app.use(koaStatic(path.resolve(__dirname, './public')));
	app.use(koaStatic(path.resolve(process.cwd(), './app/public')));

	// 模板渲染引擎
	const koaNunjucks = require('koa-nunjucks-2');
	app.use(koaNunjucks({
	  ext: 'tpl',
	  path: path.resolve(process.cwd(), './app/public'),
	  nunjucksConfig: {
	  	noCache: true,
	    trimBlocks: true
	  }
	}));

	// 引入 ctx.body 解析中间件
	const bodyParser = require('koa-bodyparser');
	app.use(bodyParser({
		formList: '1000mb',
		enableTypes: [ 'form', 'json', 'text' ]
	}));

	// 引入异常捕获中间件
	app.use(app.middlewares.errorHandler);

	// 引入签名合法性校验
	app.use(app.middlewares.apiSignVerify);

	// 引入 API 参数校验
	app.use(app.middlewares.apiParamsVerify);

	// 引入 项目处理中间件
	app.use(app.middlewares.projectHandler);
}