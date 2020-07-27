## Anot.js 2.x
> Anot 是Anot not only templateEngine的缩写。 它是一款迷你,易用、高性能的前端MVVM框架, fork于avalon。
>2.0版进行了大量的精简, 移除了非现代浏览器的兼容代码, 移除组件API, 正式引入web component。

>> 2.x版本为 全新版本, 只兼容支持type="module"的浏览器。

```bash
# 开发模式
npm start
```


```bash
# 打包
npm run prod
```
执行完, 会打包为2个版本, 分别是
- anot.js  普通版(需要支持es6 module的现代浏览器)
- anot.touch.js  带触摸事件的版本(需要支持es6 module的现代浏览器)


### 文档:
[文档](https://doui.cc/wiki/anot)

### 基于Anot.js的组件库
[文档](https://doui.cc)