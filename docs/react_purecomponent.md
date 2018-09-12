# 从源码看React.PureComponent

> 本文源码是2018年9月12日拉取的React仓库master分支上的代码

React.PureComponent 官方文档：[https://reactjs.org/docs/react-api.html#reactpurecomponent](https://reactjs.org/docs/react-api.html#reactpurecomponent)

## Component 与 PureComponent 的区别

> React.PureComponent is similar to React.Component. The difference between them is that React.Component doesn’t implement shouldComponentUpdate(), but React.PureComponent implements it with a shallow prop and state comparison.

React.PureComponent 和 React.Component 几乎相同，区别在于 React.PureComponent 会浅比较props、state是否发生变化从而决定是否更新组件

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