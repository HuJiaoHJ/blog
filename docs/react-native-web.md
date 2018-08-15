# react native 转 web 方案：react-native-web

本文将从三个方面分享react native 转 web 方案：react-native-web

* react-native-web 的使用
* react-native-web 源码分析
* react-native-web 实践

react-native-web：[https://github.com/necolas/react-native-web](https://github.com/necolas/react-native-web)

## 使用

### 安装

```bash
yarn add react react-dom react-native-web
```

如果使用了 `ART`，需要安装 `react-art`（比如，使用了 react-native-svg 来做RN端icon方案，这就是基于 react-art）

```bash
yarn add react-art
```

安装好之后，使用主要分一下两步：

* webpack配置
* 入口处新增配置

### webpack配置

webpack配置就跟普通 React web 应用配置一致即可，然后新增alias配置，如下：

```JavaScript
// webpack.config.js
module.exports = {
  // ...the rest of your config
  resolve: {
    alias: {
      'react-native$': 'react-native-web'
    }
  }
}
```

### 入口处新增配置

有两种方式：

* 使用 AppRegistry API
* 使用 render 方法

#### 使用 AppRegistry API

在新增配置之前，首先看看RN的入口文件：

```JavaScript
// index.js
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('rn_web', () => App);
```

新增配置之后，如下：

```JavaScript
// index.web.js
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('rn_web', () => App);

AppRegistry.runApplication('rn_web', {
    rootTag: document.getElementById('react-root')
});
```

#### 使用 render 方法

使用 render 方法如下：

```JavaScript
import { render } from 'react-native';
import App from './App';

render(<App/>, rootTag: document.getElementById('react-root'));
```

可以看到，AppRegistry API 更贴近RN的写法，render 方法跟 ReactDOM.render 是一个意思。

以上，就能够将现有RN页面转成web页面了

接下来，以 AppRegistry API 为入口，看看 react-native-web 做了什么

## react-native-web 源码分析

从三部分来对源码进行分析：

* 入口，即 AppRegistry API
* 组件，即对 RN 组件重写
* API，即对 RN API重写

### 入口：AppRegistry API

入口文件代码：

```JavaScript
// index.web.js
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('rn_web', () => App);

AppRegistry.runApplication('rn_web', {
    rootTag: document.getElementById('react-root')
});
```

那我们来来看看这两个 API 都做了什么

#### AppRegistry.registerComponent

```JavaScript
const runnables = {};
static registerComponent(appKey: string, componentProvider: ComponentProvider): string {
    runnables[appKey] = {
        getApplication: appParameters => getApplication(componentProviderInstrumentationHook(componentProvider), appParameters ? appParameters.initialProps : emptyObject, wrapperComponentProvider && wrapperComponentProvider(appParameters)),
        run: appParameters => renderApplication(componentProviderInstrumentationHook(componentProvider), appParameters.initialProps || emptyObject, appParameters.rootTag, wrapperComponentProvider && wrapperComponentProvider(appParameters), appParameters.callback)
    };
    return appKey;
}
```

以例子代码为例，此方法就是定义了 `runnables['rn_web']` 对象，此对象有 getApplication、run 两个方法

#### AppRegistry.runApplication

```JavaScript
static runApplication(appKey: string, appParameters: Object): void {
    runnables[appKey].run(appParameters);
}
```

以例子代码为例，此方法就是调用了

```JavaScript
runnables['rn_web'].run({
    rootTag: document.getElementById('react-root')
})
```

这里的 **appParameters** 数据结构如下：

```JavaScript
{
    initialProps, // 初始props
    rootTag, // root DOM节点
    callback, // 回调函数
}
```

#### renderApplication

```JavaScript
import { render } from 'react-dom';
const renderFn = render;
function renderApplication<Props: Object>(RootComponent: ComponentType<Props>, initialProps: Props, rootTag: any, WrapperComponent?: ?ComponentType<*>, callback?: () => void) {
    renderFn(
        <AppContainer WrapperComponent={WrapperComponent} rootTag={rootTag}>
            <RootComponent {...initialProps} />
        </AppContainer>,
        rootTag,
        callback
    );
}
```

实际调用的是：

```JavaScript
ReactDOM.render(
    <AppContainer WrapperComponent={WrapperComponent} rootTag={rootTag}>
        <App {...initialProps} />
    </AppContainer>,
    rootTag,
    callback
);
```

#### AppContainer

```JavaScript
export default class AppContainer extends Component<Props, State> {
  state = { mainKey: 1 };

  static childContextTypes = {
    rootTag: any
  };

  static propTypes = {
    WrapperComponent: any,
    children: node,
    rootTag: any.isRequired
  };

  getChildContext(): Context {
    return {
      rootTag: this.props.rootTag
    };
  }

  render() {
    const { children, WrapperComponent } = this.props;
    let innerView = (
      <View
        children={children}
        key={this.state.mainKey}
        pointerEvents="box-none"
        style={styles.appContainer}
      />
    );

    if (WrapperComponent) {
      innerView = <WrapperComponent>{innerView}</WrapperComponent>;
    }
    return (
      <View pointerEvents="box-none" style={styles.appContainer}>
        {innerView}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1
  }
});
```

### API

像 Platform, StyleSheet 都是RN提供的API，react-native-web 都是相应的重写成web端使用的，如 Platform ，代码如下：

```JavaScript
const Platform = {
  OS: 'web',
  select: (obj: Object) => ('web' in obj ? obj.web : obj.default)
};
export default Platform;
```

我们都知道，RN中使用的样式表是CSS的子集，我们来看看 react-native-web 对样式表的处理

#### StyleSheet


