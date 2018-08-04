## Anot.js
> Anot 是Anot not only templateEngine的缩写。 它是一款迷你,易用、高性能的前端MVVM框架, fork于avalon。进行了大量的重构,精简部分冗余的API, 同时针对组件拓展进行了优化。


```bash
# 开发模式
npm start
```


```bash
# 打包
npm run prod
```
执行完, 会打包为6个版本, 分别是
- anot.js  普通版(可用于webpack)
- anot-touch.js 普通带触摸版(可用于webpack)
- anot.shim.js  自带AMD加载版
- anot-touch.shim.js 自带AMD加载带触摸版
- anot.next.js  未来版(需要支持es6 module的现代浏览器)
- anot-touch.next.js  带触摸的未来版(需要支持es6 module的现代浏览器)


### 文档:
[文档](https://doui.cc/wiki/anot)

### 基于Anot.js的组件库
[文档](https://doui.cc)