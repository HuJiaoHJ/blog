# 从源码看React.PureComponent

> 本文源码是2018年9月12日拉取的React仓库master分支上的代码

React.PureComponent 官方文档：[https://reactjs.org/docs/react-api.html#reactpurecomponent](https://reactjs.org/docs/react-api.html#reactpurecomponent)

## Component 与 PureComponent 的区别

> React.PureComponent is similar to React.Component. The difference between them is that React.Component doesn’t implement shouldComponentUpdate(), but React.PureComponent implements it with a shallow prop and state comparison.

React.PureComponent 和 React.Component 几乎相同，区别在于 React.PureComponent 会 **浅比较** props、state是否发生变化从而决定是否更新组件（这里的浅比较在后面的源码分析中会提到）

使用 React.PureComponent 也是React应用优化的一种方式，当然也能使用 React.Component 定义`shouldComponentUpdate`生命周期函数来实现一样的功能，但是直接使用 React.PureComponent 能更加直观和简便

看一个简单的例子：

**使用React.Component**

```JavaScript
class CounterButton extends React.Component {
    state = {
        count: 1
    }
    shouldComponentUpdate(nextProps, nextState) {
        if (this.props.color !== nextProps.color) {
            return true;
        }
        if (this.state.count !== nextState.count) {
            return true;
        }
        return false;
    }
    render() {
        return (
            <button
                color={this.props.color}
                onClick={() => this.setState(state => ({count: state.count + 1}))}>
                Count: {this.state.count}
            </button>
        );
    }
}
```

**使用React.PureComponent**

```JavaScript
class CounterButton extends React.PureComponent {
    state = {
        count: 1
    }
    render() {
        return (
            <button
                color={this.props.color}
                onClick={() => this.setState(state => ({count: state.count + 1}))}>
                Count: {this.state.count}
            </button>
        );
    }
}
```

上面两段代码都能避免不必要的组件更新，优化性能

## 源码

### Component & PureComponent 定义

**ReactBaseClasses.js**

```JavaScript
const emptyObject = {};
/**
 * Base class helpers for the updating state of a component.
 */
function Component(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};

Component.prototype.setState = function(partialState, callback) {
  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

/**
 * Convenience component with default shallow equality check for sCU.
 */
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
Object.assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;

export {Component, PureComponent};
```

从源码来看，Component 和 PureComponent 基本一样，唯一区别在于 PureComponent 定义了 `isPureReactComponent` 为 `true`，这是为了方便在React应用运行过程中区分 Component 和 PureComponent

在分析后续的源码之前，建议小伙伴去看下我的文章：[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)，这篇文章分析了React应用整体的执行流程

本文重点分析 reconciliation阶段 `beginWork`函数中的 `updateClassComponent`函数的调用（这一部分在 [React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7) 中重点分析了）

`beginWork`函数主要有两部分工作：

1、对Context进行处理

2、根据Fiber节点的tag类型，调用对应的update方法

而tag类型为`ClassComponent`的Fiber节点会调用`updateClassComponent`函数，我们来看看`updateClassComponent`函数的核心源码

```JavaScript
function updateClassComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: any,
  nextProps,
  renderExpirationTime: ExpirationTime,
) {
  ...
  let shouldUpdate;
  if (current === null) {
    if (workInProgress.stateNode === null) {
      // In the initial pass we might need to construct the instance.
      constructClassInstance(
        workInProgress,
        Component,
        nextProps,
        renderExpirationTime,
      );
      mountClassInstance(
        workInProgress,
        Component,
        nextProps,
        renderExpirationTime,
      );
      shouldUpdate = true;
    } else {
      // In a resume, we'll already have an instance we can reuse.
      shouldUpdate = resumeMountClassInstance(
        workInProgress,
        Component,
        nextProps,
        renderExpirationTime,
      );
    }
  } else {
    shouldUpdate = updateClassInstance(
      current,
      workInProgress,
      Component,
      nextProps,
      renderExpirationTime,
    );
  }
  return finishClassComponent(
    current,
    workInProgress,
    Component,
    shouldUpdate,
    hasContext,
    renderExpirationTime,
  );
}
```

执行流程如下：

**current为null，表示当前组件第一次渲染**

判断当前组件是否需要初始化

* `workInProgress.stateNode === null`表示需要初始化，调用`constructClassInstance`、`mountClassInstance`两个函数
* 否则，表示组件已初始化，则调用`resumeMountClassInstance`函数复用初始化过的实例

（React源码也在不断更新，所以这块逻辑比[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)讲的逻辑多了一个复用逻辑）

**current不为null，调用`updateClassInstance`**

`constructClassInstance`、`mountClassInstance`做的工作：

* `constructClassInstance`主要是初始化组件实例，即调用`constructor`构造函数，并注入`classComponentUpdater`
* `mountClassInstance`则是调用`getDerivedStateFromProps`生命周期函数（v16）及`UNSAFE_componentWillMount`生命周期函数

从上面的源码可以看到，`resumeMountClassInstance`函数和`updateClassInstance`函数都会将返回值赋值给`shouldUpdate`变量，而`shouldUpdate`变量是布尔类型，在后面的流程中，决定是否执行`render`函数

这里以`updateClassInstance`函数为例来看看源码

```JavaScript
function updateClassInstance(
  current: Fiber,
  workInProgress: Fiber,
  ctor: any,
  newProps: any,
  renderExpirationTime: ExpirationTime,
): boolean {
  // 如果新老props不一致，则会调用 UNSAFE_componentWillReceiveProps 生命周期函数
  ...
  let updateQueue = workInProgress.updateQueue;
  if (updateQueue !== null) {
    processUpdateQueue(
      workInProgress,
      updateQueue,
      newProps,
      instance,
      renderExpirationTime,
    );
    newState = workInProgress.memoizedState;
  }
  // 执行 getDerivedStateFromProps 生命周期函数
  ...
  const shouldUpdate =
    checkHasForceUpdateAfterProcessing() ||
    checkShouldComponentUpdate(
      workInProgress,
      ctor,
      oldProps,
      newProps,
      oldState,
      newState,
      nextLegacyContext,
    );

  if (shouldUpdate) {
    ...
  } else {
    ...
  }
  ...
  return shouldUpdate;
}
```

重点关注`checkShouldComponentUpdate`函数

```JavaScript
function checkShouldComponentUpdate(
  workInProgress,
  ctor,
  oldProps,
  newProps,
  oldState,
  newState,
  nextLegacyContext,
) {
  const instance = workInProgress.stateNode;
  if (typeof instance.shouldComponentUpdate === 'function') {
    startPhaseTimer(workInProgress, 'shouldComponentUpdate');
    const shouldUpdate = instance.shouldComponentUpdate(
      newProps,
      newState,
      nextLegacyContext,
    );
    stopPhaseTimer();

    return shouldUpdate;
  }

  if (ctor.prototype && ctor.prototype.isPureReactComponent) {
    return (
      !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
    );
  }

  return true;
}
```

执行流程如下：

1、是否有`shouldComponentUpdate`生命周期函数，有则调用此生命周期函数并返回结果(**shouldUpdate**)

2、判断此组件是否为`PureComponent`，是则执行`shallowEqual`对新老props、新老state进行浅比较，并返回比较结果

3、默认返回true

`shallowEqual`函数：

```JavaScript
const hasOwnProperty = Object.prototype.hasOwnProperty;
function is(x, y) {
  // SameValue algorithm
  if (x === y) {
    // Steps 1-5, 7-10
    // Steps 6.b-6.e: +0 != -0
    // Added the nonzero y check to make Flow happy, but it is redundant
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    // Step 6.a: NaN == NaN
    return x !== x && y !== y;
  }
}
/**
 * Performs equality by iterating through keys on an object and returning false
 * when any key has values which are not strictly equal between the arguments.
 * Returns true when the values of all keys are strictly equal.
 */
function shallowEqual(objA: mixed, objB: mixed): boolean {
  if (is(objA, objB)) {
    return true;
  }
  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false;
  }
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

export default shallowEqual;
```

可以看到，`shallowEqual`真的就是浅比较，所以对于props、state是复杂数据结构如果使用 PureComponent 往往会导致更新问题

当props、state是简单数据结构的组件适合使用 PureComponent，或者使用 forceUpdate() 来更新复杂数据结构，或者考虑结合 [immutable objects](https://facebook.github.io/immutable-js/) 使用，或者直接使用 Component，自定义`shouldComponentUpdate`生命周期函数

说到 `forceUpdate()`可以顺便看下源码，首先看看 `forceUpdate`函数定义，在前面也说过在给组件初始化时，会给组件实例注入`classComponentUpdater`，而调用`forceUpdate`其实就是调用`classComponentUpdater.enqueueForceUpdate`，来看看定义

```JavaScript
const classComponentUpdater = {
  ...
  enqueueForceUpdate(inst, callback) {
    ...
    const update = createUpdate(expirationTime);
    // !!!
    update.tag = ForceUpdate;

    if (callback !== undefined && callback !== null) {
      update.callback = callback;
    }

    enqueueUpdate(fiber, update);
    scheduleWork(fiber, expirationTime);
  },
};
```

可以看到，在将update放入队列之前，执行了`update.tag = ForceUpdate;`，这个标记将在后面用于标识更新是否为`ForceUpdate`，后面的流程与正常更新流程一直，可以参考[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)

我们再回到`updateClassInstance`函数，在执行`checkShouldComponentUpdate`函数之前，执行了`processUpdateQueue`函数及进行了`checkHasForceUpdateAfterProcessing`函数判断

`processUpdateQueue`函数主要是遍历`updateQueue`，调用`getStateFromUpdate`函数

`getStateFromUpdate`函数源码如下：

```JavaScript
function getStateFromUpdate<State>(
  workInProgress: Fiber,
  queue: UpdateQueue<State>,
  update: Update<State>,
  prevState: State,
  nextProps: any,
  instance: any,
): any {
  switch (update.tag) {
    case ReplaceState: {
      ...
    }
    case CaptureUpdate: {
      ...
    }
    // Intentional fallthrough
    case UpdateState: {
      ...
    }
    case ForceUpdate: {
      hasForceUpdate = true;
      return prevState;
    }
  }
  return prevState;
}
```

我们可以看到，此函数是判断update的tag类型，对于`ForceUpdate`类型会将`hasForceUpdate`变量设置为true

`checkHasForceUpdateAfterProcessing`函数则是返回`hasForceUpdate`变量，代码如下：

```JavaScript
export function checkHasForceUpdateAfterProcessing(): boolean {
  return hasForceUpdate;
}
```

当调用了`forceUpdate`函数，无论是否存在`shouldComponentUpdate`生命周期函数，无论此组件是否为 PureComponent，都会强制更新，所以应该谨慎使用


## 写在最后

以上就是我对React PureComponent的源码的分享，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)