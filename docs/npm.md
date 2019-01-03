# npm包的那些事

* 初始化
* 入口
* 依赖
* 文件
* 版本号管理
* 自动化发布

## 初始化

在项目根目录下执行：`npm init` 创建 `package.json` 文件，这也是npm包的核心配置文件

## 入口

`package.json` 中可以通过下面两个字段来指定入口文件：

* main 指向 commonjs 模块的入口，使用 require 语法引入
* module 指向 ES2015 模块的入口，使用 import 语法引入，支持webpack等构建工具的 tree shaking 优化

这里，可以展开介绍一下 umd、commonjs、es module 模块类型的区别

* umd 是兼容 commonjs、amd 的通用模块规范，支持全变量规范，可以直接通过`<script>`标签引入，写法如下：

```javascript
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global['xxx'] = factory());
}(this, (function () { 'use strict';
    ...
})));
```

* commonjs 使用`module.exports`定义模块对外输出的接口，使用`require`加载模块
* es module 是ES6模块，使用`export`、`import`语法

而一般npm包都需要支持以上三种模块规范，以下列出通用的rollup配置：

```javascript
import path from 'path';
import babel from 'rollup-plugin-babel';
import cleanup from 'rollup-plugin-cleanup';
import replace from 'rollup-plugin-replace';
import { uglify } from 'rollup-plugin-uglify';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';

const { version, name, author } = pkg;

const banner = `/*!
* ${name} v${version}
* (c) ${new Date().getFullYear()} ${author}
*/`;

const resolve = p => {
    return path.resolve(__dirname, p);
}

const pluginsCommon = [
    commonjs({
        // polyfill async/await
        'node_modules/@babel/runtime/helpers/asyncToGenerator.js': ['default']
    }),
    nodeResolve({
        module: false,
    }),
    babel({
        runtimeHelpers: true,
    }),
]

export default [
    {
        input: resolve('src/index.js'),
        plugins: pluginsCommon.concat([
            cleanup(),
        ]),
        output: {
            file: resolve(`dist/npmpackage-name-${version}.js`),
            format: 'umd',
            name: 'npmpackage-name',
            banner,
        }
    },
    {
        input: resolve('src/index.js'),
        plugins: pluginsCommon.concat([
            uglify(),
        ]),
        output: {
            file: resolve(`dist/npmpackage-name-${version}.min.js`),
            format: 'umd',
            name: 'npmpackage-name',
            banner,
        }
    },
    {
        input: resolve('src/index.js'),
        plugins: pluginsCommon.concat([
            cleanup(),
        ]),
        output: [
            {
                file: resolve(`dist/npmpackage-name.es.js`),
                format: 'es',
                banner,
            },
            {
                file: resolve(`dist/npmpackage-name.js`),
                format: 'cjs',
                banner,
            }
        ]
    },
];
```

再附上对应的babel配置：

```json
{
    "presets": [
        ["@babel/preset-env", {
            "targets": {
                "browsers": ["Android >= 4", "iOS >= 8"]
            },
            "modules": false,
            "loose": true
        }]
    ],
    "plugins": [
        "@babel/plugin-external-helpers",
        [
            "@babel/plugin-transform-runtime",
            {
                "regenerator": true
            }
        ]
    ]
}
```

以上，配置则能构建出满足以上三种模块规范的文件

相应的`package.json`文件中，也需要通过不同的字段，来指定对应模块规范的入口文件，如下：

```json
{
    ...
    "main": "dist/npmpackage-name.js",
    "module": "dist/npmpackage-name.es.js",
    ...
}
```

而`dist/npmpackage-name-${version}.js`的文件，则可以直接通过`<script>`标签引入

注意：不要将入口文件指定为未过babel的文件，这往往会导致使用了此包的项目出现兼容问题

## 依赖

`package.json`中跟npm包依赖相关的字段主要有：

* dependencies：项目运行时所依赖的模块
* devDependencies：项目开发时所依赖的模块
* peerDependencies：这是“同伴依赖”，一种特殊的依赖，在发布包的时候需要。有这种依赖意味着安装包的用户也需要和包同样的依赖。（在安装包时会提示）

我们在开发npm包过程中，需要注意安装依赖的类型。

对于那些对版本有强要求的依赖，为了避免因依赖版本不一致导致问题，需要将此类依赖安装在 peerDependencies 中

## 文件

一个npm包一般包括源文件、构建产出的文件、demo文件、测试文件等文件，而为了减小npm包大小，加快下载速度，发布时应该将无用的文件剔除掉，有两种方式：

* 使用 `package.json` 中的 `files` 指定需要发布的文件
* 在 `.npmignore` 文件中指定需要提出的文件

## 版本号管理

每发布一个版本，版本号需要相应的升级（不要手动在package.json中维护）

应该通过`npm version `来对版本号进行管理，版本号有以下几种类型：

* major: 主版本号
* minor: 次版本号
* patch: 补丁号
* premajor: 预备主版本
* preminor: 预备次版本
* prepatch: 预备补丁号
* prerelease: 预发布版本

版本号管理策略如下：

* 版本号格式：主版本号.次版本号.修订号
* 主版本号：有不兼容的 API 修改
* 次版本号：有向后兼容的功能性新增
* 修订号：有向后兼容的问题修正

而升级对应的版本号的命令则如下:

```bash
npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease [--preid=<prerelease-id>] | from-git]
```

## 发布自动化

`package.json`配置如下：

```json
{
    "scripts": {
        "build": "rm -rf dist && rollup --config",
        "release_major": "npm version major",
        "release_minor": "npm version minor",
        "release_patch": "npm version patch",
        "postversion": "npm publish",
        "prepublishOnly": "npm run build"
    },
}
```

直接通过执行对应的`release_`命令来进行发布即可

以上就是一个npm包通常会用到基本事项，下面分享点其他的点，后续会不断更新~

## bin

TODO

## 写在最后

希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)