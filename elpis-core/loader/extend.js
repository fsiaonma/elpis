const glob = require('glob');
const path = require('path');
const { sep } = path;

/**
 * extend loader
 * @param {object} app Koa 实例
 *
 * 加载所有 extend，可通过 'app.extend.${文件}' 访问
 *
   例子：
   app/extend
      |
      |  -- custom-extend.js

   => app.extend.customExtend 访问
 *
 */
module.exports = (app) => {
  // 读取 elpis/app/extend/**.js 下所有的文件
  const elpisExtendPath = path.resolve(__dirname, `..${sep}..${sep}app${sep}extend`);
  const elpisFileList = glob.sync(path.resolve(elpisExtendPath, `.${sep}**${sep}**.js`));
  elpisFileList.forEach(file => {
    handleFile(file);
  });

  // 读取 业务/app/extend/**.js 下所有的文件
  const businessExtendPath = path.resolve(app.businessPath, `.${sep}extend`);
  const businessFileList = glob.sync(path.resolve(businessExtendPath, `.${sep}**${sep}**.js`));
  businessFileList.forEach(file => {
    handleFile(file);
  });

  // 把内容加载到 app.extend 下
  function handleFile(file) {
    // 提取文件名称
    let name = path.resolve(file);

    // 截取路径 app/extend/custom-extend.js => custom-extend
    name = name.substring(name.lastIndexOf(`extend${sep}`) + `extend${sep}`.length, name.lastIndexOf('.'));

    // 把 '-' 统一改为驼峰式，custom-module/custom-extend.js => customModule.customExtend
    name = name.replace(/[_-][a-z]/ig, (s) => s.substring(1).toUpperCase());

    // 过滤 app 已经存在的 key
    for (const key in app) {
      if (key === name) {
        console.log(`[extend load error] name:${name} is already in app`);
        return;
      }
    }

    // 挂载 extend 到 app 上
    app[name] = require(path.resolve(file))(app);
  }
}