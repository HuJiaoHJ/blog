# 【Node】简单快捷的图片压缩脚本

在写个人博客时，经常需要使用到图片，为了优化文章的阅读体验，需要对图片进行压缩，现在有很多好用的图片压缩网站，比如：[https://tinypng.com/](https://tinypng.com/)

但是每次压缩都手动的去上传下载，还挺麻烦的，于是想着写一个node脚本来做图片压缩工作

本文介绍的方法真的很简单快捷，使用的是 [https://tinypng.com/](https://tinypng.com/) 提供的Node API，文档：[https://tinypng.com/developers/reference/nodejs](https://tinypng.com/developers/reference/nodejs)

在使用之前，需要去申请一个API Key，入口：[https://tinypng.com/developers](https://tinypng.com/developers)，注意一个API Key一个月只能免费压缩500个图片，不过我觉得还是够用的

具体使用方式可以参考官方文档，下面介绍如何批量的对图片进行压缩，直接上代码：

**tinify.js**

```JavaScript
const tinify = require('tinify');
const apiKey = require('./api_key');
const fs = require('fs');
const path = require('path');
// API Key
tinify.key = apiKey;

// 执行图片压缩任务，返回promise对象
const task = file => {
    const source = tinify.fromFile(file.fromFile);
    source.toFile(file.toFile);
    return source._url;
}
// 通过输入文件夹和输出文件夹，返回一个数组
const fromDir = (inDir, outDir, _files = []) => {
    const files = fs.readdirSync(inDir);
    for (let file of files) {
        const filePath = `${inDir}/${file}`;
        const toFilePath = `${outDir}/${file}`;
        if (fs.statSync(filePath).isDirectory()) {
            fromDir(filePath, toFilePath, _files)
        } else {
            try {
                fs.accessSync(toFilePath);
            } catch (err) {
                _files.push({
                    fromFile: filePath,
                    toFile: toFilePath,
                });
            }
        }
    }
    return _files;
}

const rootDir = fs.realpathSync(process.cwd());
const screenshotDir = path.resolve(rootDir, './screenshotin');
const screenshotOutDir = path.resolve(rootDir, './screenshot');

const files = fromDir(screenshotDir, screenshotOutDir);

// 遍历数组，顺序执行各任务
if (files.length === 0) {
    return;
}
let current = task(files[0]);
for (let i = 1; i < files.length; i++) {
    current = current.then(task(files[i]));
}
```

执行 `node tinify.js`，即可批量压缩 `./screenshotin` 文件夹下的图片啦

## 写在最后

这个脚本是用于压缩我的博客中的图片，基本能满足我的个人需求，其他情况并未考虑，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)