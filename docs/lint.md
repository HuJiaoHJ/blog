# 前端工程工作流规范

在日常开发过程中，前端工程工作流程规范主要包括代码检查规范以及代码提交规范。而代码检查主要两个部分：语法检查及类型检查；代码提交规范主要是Git Commit Log规范。

本文主要分享日常工作中，实现自动化工作流规范的几种工具：

1、JavaScript语法检查 - ESLint

2、JavaScript类型检查 - Flow

3、自动化代码检查规范 - husky + lint-staged

4、自动化代码提交规范 - husky + commitlint

## JavaScript语法检查 - ESLint

文档：https://cn.eslint.org/docs/user-guide/configuring

### 安装

安装ESLint

```bash
npm install eslint --dev
```

安装其他依赖

```bash
// babel-eslint 是对babel解析器的包装，使其能与ESLint兼容，支持对babel编译的代码进行检查
npm install babel-eslint -dev

// eslint-config-react-app 此插件包括了使用Create React App创建的项目中默认的ESLint配置
npm install eslint-config-react-app --dev

// eslint-plugin-react 此插件是与React语法相关的检查规则
npm install eslint-plugin-react --dev

// eslint-plugin-jsx-a11y 此插件是与JSX语法相关的检查规则
npm install eslint-plugin-jsx-a11y --dev

// eslint-plugin-import 此插件用于支持ES6的import/export语法检查
npm install eslint-plugin-import --dev

// eslint-plugin-flowtype 此插件是与flow相关的检查规则，使用了flow的项目，需要引入
npm install eslint-plugin-flowtype --dev
```

### 配置

**.eslintrc.js**

```JavaScript
module.exports = {
    parser: 'babel-eslint',
    extends: ['react-app', 'plugin:flowtype/recommended'],
    plugins: ['react', 'flowtype', 'jsx-a11y', 'import'],
    rules: {
        // 【error】使用单引号
        quotes: ['error', 'single'],
        // 句末不加分号
        semi: ['error', 'never'],
        // 【warn】禁止未使用过的变量
        'no-unused-vars': [
            'warn',
            {
              vars: 'all',
              args: 'none',
            },
        ],
        ...
    }
}
```

### 检查

**命令行**

```bash
npx eslint src
```

**package.json**

```JSON
{
    "scripts": {
        "lint": "eslint src"
    }
}
```

```bash
npm run lint
```

## JavaScrip静态类型检查 - flow

### 安装

```bash
// 注意：对于使用react-native init创建的项目，flow-bin版本应使用 0.76.0
npm install flow-bin --dev
```

### 配置

**.flowconfig** 使用react-native init默认的配置即可

### 检查

**命令行**

```bash
npx flow check
```

**package.json**

```JSON
{
    "scripts": {
        "staged_flow": "flow focus-check"
    }
}
```

```bash
npm run staged_flow
```

## husky + lint-staged 自动化代码检查流程

上面介绍了通过eslint对JavaScript语法进行检查，通过flow对JavaScript静态类型检查，而在实际开发过程中，为了提高开发效率，应该只对本次提交所修改的文件进行检查，而不是每次都对所有文件进行检查。

这就需要使用 [lint-staged](https://github.com/okonet/lint-staged) 来实现。使用如下：

```bash
// 安装
$ npm install --save-dev lint-staged
```

```JSON
// 配置 package.json
{
    "lint-staged": {
        "src/**/{*.js,*.jsx}": [
            "yarn run lint",
            "yarn run staged_flow"
        ]
    },
}
```

而我们使用 [husky](https://github.com/typicode/husky) 来更方便的使用 Git Hooks。使用如下：

```bash
// 安装
$ npm install husky --save-dev
```

```JSON
// 配置 package.json
{
    "husky": {
        "hooks": {
            "pre-commit": "lint-staged"
        }
    }
}
```

以上就是配置 `pre-commit` Git Hook，支持每次提交前，执行 `lint-staged`，即对此次提交所修改的文件进行代码检查。从而实现了代码流程的自动化。

## Git Commit Log 规范

开发过程中，需要规范不仅仅只有代码上的规范，还有很重要的一部分则是Git Commit Log规范。

Git Commit Log规范最为流行的则是[Angular规范](https://docs.google.com/document/d/1QrDFcIiPjSLDn3EL15IJygNPiHORgU1_OOAqWjiDU5Y/edit#heading=h.greljkmo14y0)。使用 [commitlint](https://github.com/marionebl/commitlint) 自动化规范流程，使用如下：

```bash
// 安装
$ npm install --save-dev @commitlint/config-conventional @commitlint/cli

// 添加配置文件
$ echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

通过配合 [husky](https://github.com/typicode/husky) 配置 Git Hooks。如下：

```JSON
// 配置 package.json
{
    "husky": {
        "hooks": {
            "commit-msg": "commitlint -e $GIT_PARAMS"
        }
    }
}
```

以上，就能实现 Git Commit Log 规范流程自动化，非常方便。规范了 Git Commit Log，就能直接使用 Git Commit Log 来自动生成 changelog，使用 [conventional-changelog-cli](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli#readme)，如下：

```bash
// 安装
$ npm install --save-dev conventional-changelog-cli

// 使用
$ npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### 写在最后

本文分享的内容都是我在平时工作中用到的，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)