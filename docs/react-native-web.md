# react native转web方案：react-native-web

本文将从三个方面分享 react native 转 web 方案：react-native-web

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
* API，即对 RN API 实现
* 组件，即对 RN 组件实现

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

以 StyleSheet 为例，分析 react-native-web API 源码

我们都知道，RN中使用的样式表是CSS的子集，我们来看看 react-native-web 对样式表的处理

#### StyleSheet

```JavaScript
const StyleSheet = {
  absoluteFill,
  absoluteFillObject,
  compose(style1, style2) {
    ...
  },
  create(styles) {
    ...
  },
  flatten: flattenStyle,
  hairlineWidth: 1
};
```

RN的StyleSheet模块有以下几个方法和常量：

1、方法：

* setStyleAttributePreprocessor（此方法存在风险）
* create
* flatten

2、常量：

* hairlineWidth
* absoluteFill
* absoluteFillObject

可以发现，react-native-web 中 StyleSheet 定义了除 setStyleAttributePreprocessor（此方法存在风险）方法之外的所有方法和常量。此外，还新增了 compose 方法，此方法在 react-native-web 的组件中使用

首先来看看 StyleSheet.create 方法

##### StyleSheet.create

```JavaScript
create(styles) {
  const result = {};
  Object.keys(styles).forEach(key => {
    const id = styles[key] && ReactNativePropRegistry.register(styles[key]);
    result[key] = id;
  });
  return result;
}
```

代码比较简单，主要就是遍历styles，对所有styles调用 `ReactNativePropRegistry.register` 获取对应的id，返回对应 key-id 的对象。我们先看个例子：

```JavaScript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  ellipsis: {
    width: 200,
  }
});

console.log(styles);
```

我们来看看打印出来的styles是什么？

```JavaScript
{container: 78, welcome: 79, instructions: 80, ellipsis: 81}
```

接着来看看 `ReactNativePropRegistry.register` 做了什么

##### ReactNativePropRegistry

```JavaScript
const emptyObject = {};
const objects = {};
const prefix = 'r';
let uniqueID = 1;

const createKey = id => `${prefix}-${id}`;

export default class ReactNativePropRegistry {
  static register(object: Object): number {
    const id = uniqueID++;
    if (process.env.NODE_ENV !== 'production') {
      Object.freeze(object);
    }
    const key = createKey(id);
    objects[key] = object;
    return id;
  }

  static getByID(id: number): Object {
    if (!id) {
      return emptyObject;
    }
    const key = createKey(id);
    const object = objects[key];
    if (!object) {
      return emptyObject;
    }
    return object;
  }
}
```

这个模块，定义了两个方法：register、getByID，register 是将样式对象存入 objects 对象中，并返回对应的 id；getByID 则是通过 id 获取对应的样式对象

在react-native-web整个样式转换过程中，除了StyleSheet.create，还需要关注一下 StyleSheet.flatten 方法，即 flattenStyle

##### flattenStyle

```JavaScript
function getStyle(style) {
  if (typeof style === 'number') {
    return ReactNativePropRegistry.getByID(style);
  }
  return style;
}

function flattenStyle(style: ?StyleObj): ?Object {
  if (!style) {
    return undefined;
  }

  if (!Array.isArray(style)) {
    return getStyle(style);
  }

  const result = {};
  for (let i = 0, styleLength = style.length; i < styleLength; ++i) {
    const computedStyle = flattenStyle(style[i]);
    if (computedStyle) {
      for (const key in computedStyle) {
        const value = computedStyle[key];
        result[key] = value;
      }
    }
  }
  return result;
}
```

flattenStyle 方法接受的 styles 参数是存有样式表id的数组或变量，通过递归遍历 styles，调用上一部分提到的 `ReactNativePropRegistry.getByID` 方法，通过id获取对应的样式对象，并返回。

以上，我们以 StyleSheet 为例分析了 react-native-web 实现 RN API 的源码。

### 组件

以 View 组件为例，分析 react-native-web 组件的源码

```JavaScript
const calculateHitSlopStyle = hitSlop => {
  const hitStyle = {};
  for (const prop in hitSlop) {
    if (hitSlop.hasOwnProperty(prop)) {
      const value = hitSlop[prop];
      hitStyle[prop] = value > 0 ? -1 * value : 0;
    }
  }
  return hitStyle;
};

class View extends Component<ViewProps> {
  static displayName = 'View';

  static contextTypes = {
    isInAParentText: bool
  };

  static propTypes = ViewPropTypes;

  render() {
    const hitSlop = this.props.hitSlop;
    const supportedProps = filterSupportedProps(this.props);

    const { isInAParentText } = this.context;

    supportedProps.style = StyleSheet.compose(
      styles.initial,
      StyleSheet.compose(isInAParentText && styles.inline, this.props.style)
    );

    if (hitSlop) {
      const hitSlopStyle = calculateHitSlopStyle(hitSlop);
      const hitSlopChild = createElement('span', { style: [styles.hitSlop, hitSlopStyle] });
      supportedProps.children = React.Children.toArray([hitSlopChild, supportedProps.children]);
    }

    return createElement('div', supportedProps);
  }
}

const styles = StyleSheet.create({
  // https://github.com/facebook/css-layout#default-values
  initial: {
    alignItems: 'stretch',
    borderWidth: 0,
    borderStyle: 'solid',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    position: 'relative',
    zIndex: 0,
    // fix flexbox bugs
    minHeight: 0,
    minWidth: 0
  },
  inline: {
    display: 'inline-flex'
  },
  // this zIndex-ordering positions the hitSlop above the View but behind
  // its children
  hitSlop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1
  }
});

export default applyLayout(applyNativeMethods(View));
```

View 组件就是一个简单的React组件，首先关注一下：

```JavaScript
export default applyLayout(applyNativeMethods(View));
```

其中，`applyNativeMethods` 方法是将native的方法转换为对应的DOM方法；`applyLayout` 方法是对组件的生命周期函数进行重写。这部分感兴趣的小伙伴自行了解~

接下来关注一下 View 组件的 render 方法，主要是对组件的 props 做些处理，包括校验 props 是否支持、style 处理，最后调用 `createElement` 方法

#### createElement

```JavaScript
const createElement = (component, props, ...children) => {
  // use equivalent platform elements where possible
  let accessibilityComponent;
  if (component && component.constructor === String) {
    accessibilityComponent = AccessibilityUtil.propsToAccessibilityComponent(props);
  }
  const Component = accessibilityComponent || component;
  const domProps = createDOMProps(Component, props);
  adjustProps(domProps);
  return React.createElement(Component, domProps, ...children);
};
```

最终是调用了 `React.createElement` 方法创建 React Element，在此之前，主要做的事情就是调用 `createDOMProps` 方法，得到 domProps

#### createDOMProps

```JavaScript
const createDOMProps = (component, props, styleResolver) => {
  ...
  const {
    ...
    ...domProps
  } = props;

  // GENERAL ACCESSIBILITY
  ...

  // DISABLED
  ...

  // FOCUS
  // Assume that 'link' is focusable by default (uses <a>).
  // Assume that 'button' is not (uses <div role='button'>) but must be treated as such.
  ...

  // STYLE
  // Resolve React Native styles to optimized browser equivalent
  const reactNativeStyle = [
    component === 'a' && resetStyles.link,
    component === 'button' && resetStyles.button,
    role === 'heading' && resetStyles.heading,
    component === 'ul' && resetStyles.list,
    role === 'button' && !disabled && resetStyles.ariaButton,
    pointerEvents && pointerEventsStyles[pointerEvents],
    providedStyle,
    placeholderTextColor && { placeholderTextColor }
  ];
  const { className, style } = styleResolver(reactNativeStyle);
  if (className && className.constructor === String) {
    domProps.className = props.className ? `${props.className} ${className}` : className;
  }
  if (style) {
    domProps.style = style;
  }

  // OTHER
  // Link security and automation test ids
  ...
  return domProps;
};
```

createDOMProps 方法代码较长，这里就不全部粘贴，从几个注释可以知道，此方法主要是将各 props 转换成对应的 web 端的props，这里我们以 style 为例，看看是如何做转换的。

样式转换工作量主要在 `styleResolver` 方法，即调用 `ReactNativeStyleResolver` 实例的 `resolve` 方法。此方法最后会返回 className 和 style，最后会赋值到 domProps 中

#### styleResolver

```JavaScript
resolve(style) {
  // fast and cachable
  // style: id
  if (typeof style === 'number') {
    this._injectRegisteredStyle(style);
    const key = createCacheKey(style);
    return this._resolveStyleIfNeeded(style, key);
  }
  // resolve a plain RN style object
  // style: 样式对象
  if (!Array.isArray(style)) {
    return this._resolveStyleIfNeeded(style);
  }
  // flatten the style array
  // cache resolved props when all styles are registered
  // otherwise fallback to resolving
  // style: 存储id的数组
  const flatArray = flattenArray(style);
  let isArrayOfNumbers = true;
  for (let i = 0; i < flatArray.length; i++) {
    const id = flatArray[i];
    if (typeof id !== 'number') {
      isArrayOfNumbers = false;
    } else {
      this._injectRegisteredStyle(id);
    }
  }
  const key = isArrayOfNumbers ? createCacheKey(flatArray.join('-')) : null;
  return this._resolveStyleIfNeeded(flatArray, key);
}
```

接下来看看 `_injectRegisteredStyle` 和 `_resolveStyleIfNeeded`

#### _injectRegisteredStyle

```JavaScript
_injectRegisteredStyle(id) {
  const { doLeftAndRightSwapInRTL, isRTL } = I18nManager;
  const dir = isRTL ? (doLeftAndRightSwapInRTL ? 'rtl' : 'rtlNoSwap') : 'ltr';
  if (!this.injectedCache[dir][id]) {
    // 根据id获取对应的样式对象
    const style = flattenStyle(id);
    // 对样式对象格式化：各样式属性排序；添加长度单位；颜色值处理；特定属性处理；返回格式化之后的样式对象
    const domStyle = createReactDOMStyle(i18nStyle(style));
    Object.keys(domStyle).forEach(styleProp => {
      const value = domStyle[styleProp];
      if (value != null) {
        // 将样式插入 WebStyleSheet（domStyleElement.sheet）中
        this.styleSheetManager.injectDeclaration(styleProp, value);
      }
    });
    // 将此样式标记为已插入
    this.injectedCache[dir][id] = true;
  }
}
```

其中，`styleSheetManager.injectDeclaration` 是基于 `domStyleElement.sheet` 对页面样式进行插入操作，我们可以看看转出来的web页面的样式：

<p align="left">
    <img src="https://user-images.githubusercontent.com/11912260/44942497-0d79c400-ade5-11e8-8364-108a1d39b9e3.png">
</p>

#### _resolveStyleIfNeeded

_resolveStyleIfNeeded 方法即是调用 _resolveStyle 方法，源码如下：

```JavaScript
_resolveStyle(style) {
  // 获取对应id的样式对象
  const flatStyle = flattenStyle(style);
  // 对样式对象格式化：各样式属性排序；添加长度单位；颜色值处理；特定属性处理；返回格式化之后的样式对象
  const domStyle = createReactDOMStyle(i18nStyle(flatStyle));

  const props = Object.keys(domStyle).reduce(
    (props, styleProp) => {
      const value = domStyle[styleProp];
      if (value != null) {
        // 获取 WebStyleSheet 中特定样式属性及值对应的className
        // 通过 StyleSheet.create 创建的样式，会插入到 WebStyleSheet
        const className = this.styleSheetManager.getClassName(styleProp, value);
        if (className) {
          // 将此className放入props.classList中
          props.classList.push(className);
        } else {
          // Certain properties and values are not transformed by 'createReactDOMStyle' as they
          // require more complex transforms into multiple CSS rules. Here we assume that StyleManager
          // can bind these styles to a className, and prevent them becoming invalid inline-styles.
          // 单条样式属性，如果不是特殊属性，则直接放进props.style中
          // 单条样式属性是指未通过 StyleSheet.create 创建的样式
          if (
            styleProp === 'pointerEvents' ||
            styleProp === 'placeholderTextColor' ||
            styleProp === 'animationName'
          ) {
            const className = this.styleSheetManager.injectDeclaration(styleProp, value);
            if (className) {
              props.classList.push(className);
            }
          } else {
            if (!props.style) {
              props.style = {};
            }
            // 4x slower render
            props.style[styleProp] = value;
          }
        }
      }
      return props;
    },
    { classList: [] }
  );

  props.className = classListToString(props.classList);
  if (props.style) {
    props.style = prefixInlineStyles(props.style);
  }
  return props;
}
```

此方法主要是获取所有样式对应的 className 或者 style，并存入props中返回

以上，我们以 View 组件为例分析了 react-native-web 实现 RN 组件的源码。

我们做完源码分析之后，我们看看如何基于 react-native-web 做一些修改

## 实践

以 Text 组件为例，RN Text组件可以设置 `numberOfLines`，来实现单行或多行省略，但是react-native-web只实现了单行省略，所以我们要把多行省略的功能加上，代码如下：

```JavaScript
class Text extends Component<*> {
  ...
  render() {
    ...
    // allow browsers to automatically infer the language writing direction
    otherProps.dir = dir !== undefined ? dir : 'auto';
    otherProps.style = [
      styles.initial,
      this.context.isInAParentText === true && styles.isInAParentText,
      style,
      selectable === false && styles.notSelectable,
      numberOfLines === 1 && styles.singleLineStyle,
      onPress && styles.pressable
    ];
    // 支持多行省略
    if (numberOfLines > 1) {
      otherProps.style.push({
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: numberOfLines,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      });
    }
    const component = isInAParentText ? 'span' : 'div';
    return createElement(component, otherProps);
  }
  ...
}
```

举的这个例子比较简单，想表达的是我们通过看react-native-web源码，在开发过程中，遇到了转换web的问题，我们可以通过修改源码、或者使用它提供的API来解决

具体代码可以参考示例项目：[rn_web](https://github.com/HuJiaoHJ/rn_web)，包括源码注释和实例代码

## 写在最后

以上就是我对 react-native-web 源码的分享，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)