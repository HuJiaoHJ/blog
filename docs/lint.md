# 

## JavaScript代码检查 - ESLint

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

## Git Hook




