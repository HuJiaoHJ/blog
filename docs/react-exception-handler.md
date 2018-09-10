# 从源码看React异常处理

> 本文源码是2018年8月30日拉取的React仓库master分支上的代码

本文涉及的源码是React16异常处理部分，对于React16整体的源码的分析，可以看看我的文章：[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)

React16引入了 **Error Boundaries** 即异常边界概念，以及一个新的生命周期函数：`componentDidCatch`，来支持React运行时的异常捕获和处理

对 React16 Error Boundaries 不了解的小伙伴可以看看官方文档：[Error Boundaries](https://reactjs.org/docs/error-boundaries.html)

下面从两个方面进行分享：

* Error Boundaries 介绍和使用
* 源码分析

## Error Boundaries（异常边界）

> A JavaScript error in a part of the UI shouldn’t break the whole app. To solve this problem for React users, React 16 introduces a new concept of an “error boundary”.

> Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed. Error boundaries catch errors during rendering, in lifecycle methods, and in constructors of the whole tree below them.

从上面可以知道，React16引入了Error Boundaries（异常边界）的概念是为了避免React的组件内的UI异常导致整个应用的异常

Error Boundaries（异常边界）是React组件，用于捕获它子组件树种所有组件产生的js异常，并渲染指定的兜底UI来替代出问题的组件

它能捕获子组件生命周期函数中的异常，包括构造函数（constructor）和render函数

而不能捕获以下异常：

* Event handlers（事件处理函数）
* Asynchronous code（异步代码，如setTimeout、promise等）
* Server side rendering（服务端渲染）
* Errors thrown in the error boundary itself (rather than its children)（异常边界组件本身抛出的异常）

接下来我们来写一个异常边界组件，如下：

```JavaScript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error, info) {
    // Display fallback UI
    this.setState({ hasError: true });
    // You can also log the error to an error reporting service
    logErrorToMyService(error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

使用如下：

```
<ErrorBoundary>
  <MyWidget />
</ErrorBoundary>
```

当 `MyWidget`组件在构造函数、render函数以及所有生命周期函数中抛出异常时，异常将会被 `ErrorBoundary`异常边界组件捕获，执行 `componentDidCatch`函数，渲染对应 fallback UI 替代`MyWidget`组件

接下来，我们从源码的角度来看看异常边界组件是怎么捕获异常，以及为什么只能捕获到子组件在构造函数、render函数以及所有生命周期函数中抛出异常

## 源码分析

先简单了解一下React整体的源码结构，感兴趣的小伙伴可以看看之前写的文章：[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7) ，这篇文章包括了对React整体流程的源码分析，其中有提到React核心模块（Reconciliation，又叫协调模块）分为两阶段：（本文不会再详细介绍了，感兴趣的小伙伴自行了解哈~）

**reconciliation阶段**

函数调用流程如下：

<p align="left">
    <img width="100%" src="https://user-images.githubusercontent.com/11912260/44942441-79f3c380-ade3-11e8-859a-83a8847ecb19.png">
</p>

这个阶段核心的部分是上图中标出的第三部分，React组件部分的生命周期函数的调用以及通过Diff算法计算出所有更新工作都在第三部分进行的，所以异常处理也是在这部分进行的

**commit阶段**

函数调用流程如下：

<p align="left">
    <img width="100%" src="https://user-images.githubusercontent.com/11912260/44942460-e969b300-ade3-11e8-8a4f-1f47d4dac8da.png">
</p>

这个阶段主要做的工作拿到reconciliation阶段产出的所有更新工作，提交这些工作并调用渲染模块（react-dom）渲染UI。完成UI渲染之后，会调用剩余的生命周期函数，所以异常处理也会在这部分进行

而各生命周期函数在各阶段的调用情况如下：

<p align="left">
    <img width="700px" src="../screenShot/reactLifeCycle_new.png">
</p>

下面我们正式开始异常处理部分的源码分析，React异常处理在源码中的入口主要有两处：

1、reconciliation阶段的 `renderRoot` 函数，对应异常处理方法是 `throwException`

2、commit阶段的 `commitRoot` 函数，对应异常处理方法是 `dispatch`

### throwException

首先看看 `renderRoot` 函数源码中与异常处理相关的部分：

```JavaScript
function renderRoot(
  root: FiberRoot,
  isYieldy: boolean,
  isExpired: boolean,
): void {
  ...
  do {
    try {
      workLoop(isYieldy);
    } catch (thrownValue) {
      if (nextUnitOfWork === null) {
        // This is a fatal error.
        didFatal = true;
        onUncaughtError(thrownValue);
      } else {
        ...
        const sourceFiber: Fiber = nextUnitOfWork;
        let returnFiber = sourceFiber.return;
        if (returnFiber === null) {
          // This is the root. The root could capture its own errors. However,
          // we don't know if it errors before or after we pushed the host
          // context. This information is needed to avoid a stack mismatch.
          // Because we're not sure, treat this as a fatal error. We could track
          // which phase it fails in, but doesn't seem worth it. At least
          // for now.
          didFatal = true;
          onUncaughtError(thrownValue);
        } else {
          throwException(
            root,
            returnFiber,
            sourceFiber,
            thrownValue,
            nextRenderExpirationTime,
          );
          nextUnitOfWork = completeUnitOfWork(sourceFiber);
          continue;
        }
      }
    }
    break;
  } while (true);
  ...
}
```

可以看到，这部分就是在`workLoop`大循环外套了层`try...catch...`，在catch中判断当前错误类型，调用不同的异常处理方法

有两种异常处理方法：

1、RootError，最后是调用 `onUncaughtError` 函数处理

2、ClassError，最后是调用 `componentDidCatch` 生命周期函数处理

上面两种方法处理流程基本类似，这里就重点分析 ClassError 方法

接下来我们看看 `throwException` 源码：

```JavaScript
function throwException(
  root: FiberRoot,
  returnFiber: Fiber,
  sourceFiber: Fiber,
  value: mixed,
  renderExpirationTime: ExpirationTime,
) {
  ...
  // We didn't find a boundary that could handle this type of exception. Start
  // over and traverse parent path again, this time treating the exception
  // as an error.
  renderDidError();
  value = createCapturedValue(value, sourceFiber);
  let workInProgress = returnFiber;
  do {
    switch (workInProgress.tag) {
      case HostRoot: {
        const errorInfo = value;
        workInProgress.effectTag |= ShouldCapture;
        workInProgress.expirationTime = renderExpirationTime;
        const update = createRootErrorUpdate(
          workInProgress,
          errorInfo,
          renderExpirationTime,
        );
        enqueueCapturedUpdate(workInProgress, update);
        return;
      }
      case ClassComponent:
      case ClassComponentLazy:
        // Capture and retry
        const errorInfo = value;
        const ctor = workInProgress.type;
        const instance = workInProgress.stateNode;
        if (
          (workInProgress.effectTag & DidCapture) === NoEffect &&
          ((typeof ctor.getDerivedStateFromCatch === 'function' &&
            enableGetDerivedStateFromCatch) ||
            (instance !== null &&
              typeof instance.componentDidCatch === 'function' &&
              !isAlreadyFailedLegacyErrorBoundary(instance)))
        ) {
          workInProgress.effectTag |= ShouldCapture;
          workInProgress.expirationTime = renderExpirationTime;
          // Schedule the error boundary to re-render using updated state
          const update = createClassErrorUpdate(
            workInProgress,
            errorInfo,
            renderExpirationTime,
          );
          enqueueCapturedUpdate(workInProgress, update);
          return;
        }
        break;
      default:
        break;
    }
    workInProgress = workInProgress.return;
  } while (workInProgress !== null);
}
```

throwException函数分为两部分：

1、遍历当前异常节点的所有父节点，找到对应的错误信息（错误名称、调用栈等），这部分代码在上面中没有展示出来

2、第二部分就是上面展示出来的部分，可以看到，也是遍历当前异常节点的所有父节点，判断各节点的类型，主要还是上面提到的两种类型，这里重点讲ClassComponent类型，判断该节点是否是异常边界组件（通过判断是否存在`componentDidCatch`生命周期函数等），如果是找到异常边界组件，则调用 `createClassErrorUpdate`函数新建update，并将此update放入此节点的异常更新队列中，在后续更新中，会更新此队列中的更新工作

我们来看看 `createClassErrorUpdate`的源码：

```JavaScript
function createClassErrorUpdate(
  fiber: Fiber,
  errorInfo: CapturedValue<mixed>,
  expirationTime: ExpirationTime,
): Update<mixed> {
  const update = createUpdate(expirationTime);
  update.tag = CaptureUpdate;
  ...
  const inst = fiber.stateNode;
  if (inst !== null && typeof inst.componentDidCatch === 'function') {
    update.callback = function callback() {
      if (
        !enableGetDerivedStateFromCatch ||
        getDerivedStateFromCatch !== 'function'
      ) {
        // To preserve the preexisting retry behavior of error boundaries,
        // we keep track of which ones already failed during this batch.
        // This gets reset before we yield back to the browser.
        // TODO: Warn in strict mode if getDerivedStateFromCatch is
        // not defined.
        markLegacyErrorBoundaryAsFailed(this);
      }
      const error = errorInfo.value;
      const stack = errorInfo.stack;
      logError(fiber, errorInfo);
      this.componentDidCatch(error, {
        componentStack: stack !== null ? stack : '',
      });
    };
  }
  return update;
}
```

可以看到，此函数返回一个update，此update的callback最终会调用组件的 `componentDidCatch`生命周期函数

大家可能会好奇，update的callback最终会在什么时候被调用，update的callback最终会在commit阶段的 `commitAllLifeCycles`函数中被调用，这块在讲完dispatch之后会详细讲一下

以上就是 reconciliation阶段 的异常捕获到异常处理的流程，可以知道此阶段是在`workLoop`大循环外套了层`try...catch...`，所以workLoop里所有的异常都能被异常边界组件捕获并处理

下面我们看看 commit阶段 的 `dispatch`

### dispatch

我们先看看 `dispatch` 的源码：

```JavaScript
function dispatch(
  sourceFiber: Fiber,
  value: mixed,
  expirationTime: ExpirationTime,
) {
  let fiber = sourceFiber.return;
  while (fiber !== null) {
    switch (fiber.tag) {
      case ClassComponent:
      case ClassComponentLazy:
        const ctor = fiber.type;
        const instance = fiber.stateNode;
        if (
          typeof ctor.getDerivedStateFromCatch === 'function' ||
          (typeof instance.componentDidCatch === 'function' &&
            !isAlreadyFailedLegacyErrorBoundary(instance))
        ) {
          const errorInfo = createCapturedValue(value, sourceFiber);
          const update = createClassErrorUpdate(
            fiber,
            errorInfo,
            expirationTime,
          );
          enqueueUpdate(fiber, update);
          scheduleWork(fiber, expirationTime);
          return;
        }
        break;
      case HostRoot: {
        const errorInfo = createCapturedValue(value, sourceFiber);
        const update = createRootErrorUpdate(fiber, errorInfo, expirationTime);
        enqueueUpdate(fiber, update);
        scheduleWork(fiber, expirationTime);
        return;
      }
    }
    fiber = fiber.return;
  }

  if (sourceFiber.tag === HostRoot) {
    // Error was thrown at the root. There is no parent, so the root
    // itself should capture it.
    const rootFiber = sourceFiber;
    const errorInfo = createCapturedValue(value, rootFiber);
    const update = createRootErrorUpdate(rootFiber, errorInfo, expirationTime);
    enqueueUpdate(rootFiber, update);
    scheduleWork(rootFiber, expirationTime);
  }
}
```

dispatch函数做的事情和上部分的 `throwException` 类似，遍历当前异常节点的所有父节点，找到异常边界组件（有`componentDidCatch`生命周期函数的组件），新建update，在update.callback中调用组件的`componentDidCatch`生命周期函数，后续的部分这里就不详细描述了，和 reconciliation阶段 基本一致，这里我们看看commit阶段都哪些部分调用了dispatch函数

```JavaScript
function captureCommitPhaseError(fiber: Fiber, error: mixed) {
  return dispatch(fiber, error, Sync);
}
```

调用 captureCommitPhaseError 即调用 dispatch，而 captureCommitPhaseError 主要是在 `commitRoot` 函数中被调用，源码如下：

```JavaScript
function commitRoot(root: FiberRoot, finishedWork: Fiber): void {
  ...
  // commit阶段的准备工作
  prepareForCommit(root.containerInfo);

  // Invoke instances of getSnapshotBeforeUpdate before mutation.
  nextEffect = firstEffect;
  startCommitSnapshotEffectsTimer();
  while (nextEffect !== null) {
    let didError = false;
    let error;
    try {
        // 调用 getSnapshotBeforeUpdate 生命周期函数
        commitBeforeMutationLifecycles();
    } catch (e) {
        didError = true;
        error = e;
    }
    if (didError) {
      captureCommitPhaseError(nextEffect, error);
      if (nextEffect !== null) {
        nextEffect = nextEffect.nextEffect;
      }
    }
  }
  stopCommitSnapshotEffectsTimer();

  // Commit all the side-effects within a tree. We'll do this in two passes.
  // The first pass performs all the host insertions, updates, deletions and
  // ref unmounts.
  nextEffect = firstEffect;
  startCommitHostEffectsTimer();
  while (nextEffect !== null) {
    let didError = false;
    let error;
    try {
        // 提交所有更新并调用渲染模块渲染UI
        commitAllHostEffects(root);
    } catch (e) {
        didError = true;
        error = e;
    }
    if (didError) {
      captureCommitPhaseError(nextEffect, error);
      // Clean-up
      if (nextEffect !== null) {
        nextEffect = nextEffect.nextEffect;
      }
    }
  }
  stopCommitHostEffectsTimer();

  // The work-in-progress tree is now the current tree. This must come after
  // the first pass of the commit phase, so that the previous tree is still
  // current during componentWillUnmount, but before the second pass, so that
  // the finished work is current during componentDidMount/Update.
  root.current = finishedWork;

  // In the second pass we'll perform all life-cycles and ref callbacks.
  // Life-cycles happen as a separate pass so that all placements, updates,
  // and deletions in the entire tree have already been invoked.
  // This pass also triggers any renderer-specific initial effects.
  nextEffect = firstEffect;
  startCommitLifeCyclesTimer();
  while (nextEffect !== null) {
    let didError = false;
    let error;
    try {
        // 调用剩余生命周期函数
        commitAllLifeCycles(root, committedExpirationTime);
    } catch (e) {
        didError = true;
        error = e;
    }
    if (didError) {
      captureCommitPhaseError(nextEffect, error);
      if (nextEffect !== null) {
        nextEffect = nextEffect.nextEffect;
      }
    }
  }
  ...
}
```

可以看到，有三处（也是commit阶段主要的三部分）通过`try...catch...`调用了 `captureCommitPhaseError`函数，即调用了 `dispatch`函数，而这三个部分具体做的事情注释里也写了，详细的感兴趣的小伙伴可以看看我的文章：[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)

刚刚我们提到，update的callback会在commit阶段的`commitAllLifeCycles`函数中被调用，我们来看下具体的调用流程：

1、commitAllLifeCycles函数中会调用`commitLifeCycles`函数

2、在commitLifeCycles函数中，对于ClassComponent和HostRoot会调用`commitUpdateQueue`函数

3、我们来看看 commitUpdateQueue 函数源码：

```JavaScript
export function commitUpdateQueue<State>(
  finishedWork: Fiber,
  finishedQueue: UpdateQueue<State>,
  instance: any,
  renderExpirationTime: ExpirationTime,
): void {
  ...
  // Commit the effects
  commitUpdateEffects(finishedQueue.firstEffect, instance);
  finishedQueue.firstEffect = finishedQueue.lastEffect = null;

  commitUpdateEffects(finishedQueue.firstCapturedEffect, instance);
  finishedQueue.firstCapturedEffect = finishedQueue.lastCapturedEffect = null;
}

function commitUpdateEffects<State>(
  effect: Update<State> | null,
  instance: any,
): void {
  while (effect !== null) {
    const callback = effect.callback;
    if (callback !== null) {
      effect.callback = null;
      callCallback(callback, instance);
    }
    effect = effect.nextEffect;
  }
}
```

我们可以看到，commitUpdateQueue函数中会调用两次`commitUpdateEffects`函数，参数分别是正常update队列以及存放异常处理update队列

而commitUpdateEffects函数就是遍历所有update，调用其callback方法

上文提到，commitAllLifeCycles函数中是用于调用剩余生命周期函数，所以异常边界组件的 `componentDidCatch`生命周期函数也是在这个阶段调用

### 总结

我们现在可以知道，React内部其实也是通过 `try...catch...` 形式是捕获各阶段的异常，但是只在两个阶段的特定几处进行了异常捕获，这也是为什么异常边界只能捕获到子组件在构造函数、render函数以及所有生命周期函数中抛出的异常

细心的小伙伴应该注意到，`throwException` 和 `dispatch` 在遍历节点时，是从异常节点的父节点开始遍历，这也是为什么异常边界组件自身的异常不会捕获并处理

我们也提到了React内部将异常分为了两种异常处理方法：RootError、ClassError，我们只重点分析了 ClassError 类型的异常处理函数，其实 RootError 是一样的，区别在于最后调用的处理方法不同，在遍历所有父节点过程中，如果有异常边界组件，则会调用 ClassError 类型的异常处理函数，如果没有，一直遍历到根节点，则会调用 RootError 类型的异常处理函数，最后调用的 `onUncaughtError` 方法，此方法做的事情很简单，其实就是将 `hasUnhandledError` 变量赋值为 `true`，将 `unhandledError` 变量赋值为异常对象，此异常对象最终将在 `finishRendering`函数中被抛出，而`finishRendering`函数是在`performWork`函数的最后被调用，这块简单感兴趣的小伙伴可以自行看代码~

本文涉及很多React其他部分的源码，不熟悉的小伙伴可以看看我的文章：[React16源码之React Fiber架构](https://github.com/HuJiaoHJ/blog/issues/7)

## 写在最后

以上就是我对React16异常处理部分的源码的分享，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)