# vue-md-gen

## 简介

**根据vue文件自动生成markdown文档**

为什么不用 https://vue-styleguidist.github.io/docs/docgen-cli.html#install 而自己造轮子？

主要不满足我们文档目前的场景
1.没有md内容提取策略 (contentStrategy)
2.如果目标MD文件已存在，没有配置决定是否覆盖生成还是增量生成
3.单文件提取不友好

https://vue-styleguidist.github.io/docs/docgen-cli.html#install 也非常好用，只是不适用于我们目前场景，因此在其核心api上封装一层。

```js
/**
 * md内容提取策略
 *
 * 组件文档结构存在下面的场景
 *
 * -packages
 *   -table
 *      -src
 *         -table.vue
 *         -filter-panel.vue
 *  -addBtn
 *      -index.vue
 *  -edit
 *      -src
 *         -InlineEdit.vue
 *         -SwichEdit.vue
 *  -fileList
 *      -file.vue
 *      -index.vue
 *
 * 即一个组件文件夹下可能多个vue文件，或者只有一个vue文件
 * 对于一个vue文件，我们直接提取里面内容, 或者不提取
 * 对于多个vue文件，我们需要制定策略，需要提取index.vue还是{component}.vue,又或者是提取全部vue文件内容到一个md中
 *
 * 默认策略如下
 * index: index.vue
 * compenent: 同名component.vue
 * all: 在此如果都没有，则提取所有vue文件
 */
```

## 安装

```shell
npm i kf-vue-md-gen -D
```

## 使用

```shell
npx kfmd -c md.config.js
```
`-c 配置文件所在地址`

默认配置如下

```javascript
// md.config.js 
module.exports  = {
  contentStrategy: ['index', 'component', 'all'],//提取策略
  componentsRoot: path.resolve(process.env.pwd, 'src/components'),// 解析的目录
  components: '**/*.vue', // 解析的文件
  outDir: path.resolve(process.env.pwd, 'docs/ui'), // 输出目录
  ignore: ['**/xxxx/*.vue'], // 忽视的文件
  override: false, // 是否覆盖已有的md文件
  getDocFileName(componentPath) { // 生成的md文件命名规则，默认提取解析目录下一级目录名，并转换大小写
    const str = getRootDir(componentPath);
    return str.replace(/[A-Z]/g, function(march, g1, g2) {
      if (g1 === 0) {
        return march.toLowerCase();
      }
      return '-' + march.toLowerCase();
    });
  }
}
```



## 单文件转换
```shell
npx kfmd -t component.vue -m  componentname -o -d docs/ui
```
- -t --target [p]     目标文件绝对路径
- -m --mdname [p]     生成的md文件名
- -o --override       如有同名文件，是否覆盖
- -d --outDir [p]     生成md文件所放目录

## 致谢

1. 本插件参考 https://vue-styleguidist.github.io/docs/Docgen.html

向以上人员致谢

# 许可

MIT License

# 源码地址
https://github.com/wangziweng7890/vue-md-gen