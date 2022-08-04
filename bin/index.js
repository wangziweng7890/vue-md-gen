// 自动生成组件文档目录

/**
 * 为什么不用 https://vue-styleguidist.github.io/docs/docgen-cli.html#install 而自己造轮子？
 * 1.如果目标MD文件已存在，没有配置决定是否覆盖生成还是增量生成
 * 2.没有md内容提取策略 (contentStrategy)
 * 3.单文件提取不友好
 * */

const fs = require("fs");
const { parse } = require("vue-docgen-api"); // 引入资源包
const path = require("path");
const json2md = require("json2md");
const glob = require("glob");
const { program } = require("commander");
program.option("-t --target [p]", "目标文件绝对路径");
program.option("-m --mdname [p]", "生成的md文件名");
program.option("-o --override", "如有同名文件，是否覆盖");
program.option("-d --outDir [p]", "生成md文件所放目录");
program.option("-c --configPath [p]", "配置文件所在目录");
program.parse(process.argv);

// 去除换行符
function text2rn(text) {
  if (text && text.replace) {
    return text.replace(/\r\n/g, "");
  }
  return text === undefined ? "" : text;
}

// 获取vue文件数据
async function getData(name, paths) {
  const arr = [];
  for (const index in paths) {
    const result = await parse(paths[index]); // 异步加载需要解析的vue的文件
    arr.push(result);
  }
  return json2Md(name, arr);
}

// 创建MD内容
function json2Md(name, jsons) {
  const flag = jsons.length > 1;
  const arr = [{ h1: name }];
  jsons.forEach((data) => {
    const prefix = flag ? `${data.displayName} ` : "";
    data.description && arr.push({ blockquote: data.description });
    data.props &&
      arr.push(
        ...[
          { h2: `${prefix}Props` },
          {
            table: {
              headers: ["参数", "说明", "类型", "可选值", "默认值"],
              rows: data.props.map((prop) => {
                return [
                  prop.name,
                  "",
                  prop.type.name || "",
                  "",
                  JSON.stringify(
                    text2rn(prop.defaultValue && prop.defaultValue.value)
                  ),
                ];
              }),
            },
          },
        ]
      );
    data.events &&
      arr.push(
        ...[
          {
            h2: `${prefix}Events`,
          },
          {
            table: {
              headers: ["事件名", "说明", "参数"],
              rows: data.events.map((event) => {
                return [event.name, "", ""];
              }),
            },
          },
        ]
      );
    data.methods &&
      arr.push(
        ...[
          {
            h2: `${prefix}Methods`,
          },
          {
            table: {
              headers: ["方法名", "说明", "参数"],
              rows: data.methods.map((method) => {
                return [method.name, "", ""];
              }),
            },
          },
        ]
      );
    data.slots &&
      arr.push(
        ...[
          {
            h2: `${prefix}Slots`,
          },
          {
            table: {
              headers: ["name", "说明", "参数"],
              rows: data.slots.map((slot) => {
                return [
                  slot.name,
                  "",
                  JSON.stringify(
                    (slot.bindings &&
                      slot.bindings.map((binding) => {
                        return text2rn(binding.name);
                      })) ||
                      ""
                  ),
                ];
              }),
            },
          },
        ]
      );
  });
  return json2md(arr);
}

// 创建MD文件
function createMd(name, content, outDir) {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(outDir, `${name}.md`);
    fs.writeFile(path.resolve(filePath), content, {}, function (error) {
      if (error) {
        return reject(new Error(`[生成${name}.md失败]: ${error}`));
      }
      return resolve(name);
    });
  });
}

// 初始化
async function init() {
  console.log("开始生成MD文档, 请稍等片刻");
  const options = program.opts();
  if (options.configPath) {
    let userConfig = require(path.resolve(
      process.env.pwd,
      options.configPath
    ));
    Object.assign(Config, userConfig);
  }
  if (options.target) {
    Config.components = path
      .resolve(process.env.pwd, options.target)
      .replace(/\\/g, "/");
    Config.override = options.override || Config.override;
    Config.outDir =
      path.resolve(process.env.pwd, options.outDir) || Config.outDir;
    Config.rootDirName = options.mdname || `temp-${new Date().getTime()}`;
  }

  glob(
    Config.components,
    {
      cwd: Config.componentsRoot,
      root: Config.componentsRoot,
      ignore: Config.ignore,
    },
    async function (err, files) {
      if (err) {
        console.log("[componentsRoot]: 查找组件失败", err);
        return;
      }
      const filePaths = await getFileNoExists(
        getFileToMd(files),
        Config.outDir
      );
      const res = await Promise.allSettled(
        filePaths.map(async ([name, contentPaths]) => {
          try {
            const content = await getData(
              name,
              contentPaths.map((dir) =>
                path.resolve(Config.componentsRoot, dir)
              )
            );
            return createMd(
              Config.getDocFileName(name),
              content,
              Config.outDir
            );
          } catch (error) {
            console.log(error);
          }
        })
      );
      console.log(
        "[成功生成以下MD文件]：",
        res
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value)
      );
    }
  );
}

// 策略方法
const swichContentStrategy = {
  index(key, value) {
    const flag = value.find((item) => item.includes("index.vue"));
    return flag ? [flag] : null;
  },
  component(key, value) {
    const flag = value.find((item) => item.includes(`${key}.vue`));
    return flag ? [flag] : null;
  },
  all(key, value) {
    return value;
  },
};

// 判断该文件是否存在
async function getFileNoExists(files, outDir) {
  if (Config.override) return files;
  const arr = [];
  await Promise.all(
    files.map(([name, contentPath]) => {
      return new Promise((resolve, reject) => {
        const filePath = path.resolve(
          outDir,
          `${Config.getDocFileName(name)}.md`
        );
        fs.access(filePath, async (err) => {
          if (err) {
            arr.push([name, contentPath]);
          }
          resolve();
        });
      });
    })
  );
  return arr;
}

// 根据策略收集需要转换的VUE文件，并分组
function getFileToMd(files) {
  const mapC = new Map();
  files.forEach((file) => {
    const key = getRootDir(file);
    const arr = mapC.get(key) || [];
    arr.push(file);
    mapC.set(key, arr);
  });
  [...mapC.entries()].forEach(([key, value]) => {
    Config.contentStrategy.some((contentStrategy) => {
      const result = swichContentStrategy[contentStrategy](key, value);
      if (result) {
        mapC.set(key, result);
        return true;
      }
    });
  });
  return [...mapC.entries()];
}

// 获取根文件夹 例如传参 '/a/b/c' , 返回 'a'
function getRootDir(componentPath) {
  if (Config.rootDirName) return Config.rootDirName;
  let str = componentPath;
  while (path.dirname(str) !== ".") {
    str = path.dirname(str);
  }
  return str;
}

const contentStrategy = ["index", "component", "all"];

// 配置，暴露给用户使用
const Config = {
  contentStrategy,
  componentsRoot: path.resolve(process.env.pwd, "src/components"),
  components: "**/*.vue",
  outDir: path.resolve(process.env.pwd, "docs/ui"),
  ignore: ["**/OSSUpload/*.vue"],
  override: false, // 是否覆盖已有的md文件
  getDocFileName(componentPath) {
    const str = getRootDir(componentPath);
    return str.replace(/[A-Z]/g, function (march, g1, g2) {
      if (g1 === 0) {
        return march.toLowerCase();
      }
      return "-" + march.toLowerCase();
    });
  },
};

init();
