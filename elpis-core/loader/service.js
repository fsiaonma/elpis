const glob = require('glob');
const path = require('path');
const { sep } = path;

/**
 * service loader
 * @param {object} app Koa 实例
 *
 * 加载所有 service，可通过 'app.service.${目录}.${文件}' 访问
 *
   例子：
   app/service
     |
     | -- custom-module
              |
              |  -- custom-service.js

   => app.service.customModule.customService
 *
 */
module.exports = (app) => {
  const service = {};

  // 读取 elpis/app/service/**/**.js 下所有的文件
  const elpisServicePath = path.resolve(__dirname, `..${sep}..${sep}app${sep}service`);
  const elpisFileList = glob.sync(path.resolve(elpisServicePath, `.${sep}**${sep}**.js`));
  elpisFileList.forEach(file => {
    handleFile(file);
  });

  // 读取 业务/app/service/**/**.js 下所有的文件
  const businessServicePath = path.resolve(app.businessPath, `.${sep}service`);
  const businessFileList = glob.sync(path.resolve(businessServicePath, `.${sep}**${sep}**.js`));
  businessFileList.forEach(file => {
    handleFile(file);
  });

  // 把内容加载到 app.service 下
  function handleFile(file) {
    // 提取文件名称
    let name = path.resolve(file);

    // 截取路径 app/service/custom-module/custom-service.js => custom-module/custom-service
    name = name.substring(name.lastIndexOf(`service${sep}`) + `service${sep}`.length, name.lastIndexOf('.'));

    // 把 '-' 统一改为驼峰式，custom-module/custom-service.js => customModule.customService
    name = name.replace(/[_-][a-z]/ig, (s) => s.substring(1).toUpperCase());

    // 挂载 service 到内存 app 对象中 
    let tempService = service;
    const names = name.split(sep); // [ customModule(目录), customService(文件) ]
    for (let i = 0, len = names.length; i < len; ++i) {
      if (i === len - 1) { // 文件
        const ServiceMoule = require(path.resolve(file))(app);
        tempService[names[i]] = new ServiceMoule();
      } else { // 文件夹
        if (!tempService[names[i]]) {
          tempService[names[i]] = {};
        }
        tempService = tempService[names[i]];
      }
    }
  }

  app.service = service;
}