# H5页面监听Android物理返回键

移动端H5页面是监听不了Android物理返回键的点击事件，一般webview的默认行为是 `window.history.go(-1)` ，但是在实际需求场景下，简单的页面回退并不能满足需求，所以需要H5页面监听Android物理返回键从而自定义处理方法。

本方案的代码都在 [h5_android_back](https://github.com/HuJiaoHJ/h5_android_back) 仓库中

## 原理

主要是运用 HTML5 History API 实现。所以，首先简单介绍下 HTML5 History API

### [HTML5 History API](https://developer.mozilla.org/en-US/docs/Web/API/History)

#### history 属性

```JavsScript
history.length

history.state
```

#### history 方法

```JavaScript
history.back()

history.forward()

history.go()
```

#### HTML5 新API

##### history.pushState(state, title, url); 添加一条历史记录，不刷新页面

##### history.replaceState(state, title, url); 替换一条历史记录，不刷新页面

#### 事件

##### popState事件：历史记录发生变化时触发，调用`history.pushState()`或`history.replaceState()`不会触发此事件

```JavaScript
window.addEventListener('popstate', handlePopstate);
```

##### hashchange事件：页面`hash`值发生改变时触发

```JavaScript
window.addEventListener('hashchange', handleHashChange);
```

### 监听Android物理返回键实现

```JavaScript
// index.js
(function (pkg) {
    var STATE = '_android_back';
    // 维护处理方法的栈
    var _android_back_handles = [];
    // 触发一次popstate方法，则调用最新处理方法
    var handlePopstate = function () {
        var handle = _android_back_handles.pop();
        handle && handle();
    };
    // 通过调用listen方法添加处理方法
    var listen = function (handle) {
        _android_back_handles.push(handle);
    };
    // 通过调用push方法，新增一条历史记录，并添加对应处理方法
    var push = function (state, handle) {
        if (handle) {
            history.pushState(state, null, location.href);
            handle && _android_back_handles.push(handle);
        }
    };
    const init = function () {
        // 通过调用 history.pushState() 方法添加一条历史记录
        history.pushState(STATE, null, location.href);
        // 监听 popstate 事件，当点击Android物理返回键时，会触发该事件
        window.addEventListener('popstate', handlePopstate);
        this.listen = listen;
        this.push = push;
    };

    init.call(window[pkg] = window[pkg] || {});
})('AndroidBack');
```

> 此实现参考了 https://github.com/iazrael/xback ，在此基础上，根据需要修改和添加了一部分代码

此外，封装了一个React高阶组件，方便React项目使用，代码如下：

```JavaScript
import * as React from 'react';

export default (Target, handleBack) => {
    return class AndroidBack extends React.Component {
        _handles = []
        back = () => {
            window.history.go(-1);
        }
        componentDidMount () {
            // 通过调用 history.pushState() 方法添加一条历史记录
            history.pushState('_android_back', null, location.href);
            // 监听 popstate 事件，当点击Android物理返回键时，会触发该事件
            window.addEventListener('popstate', this.handlePopstate);
            if (handleBack) {
                // 添加自定义处理方法
                this._handles.push(handleBack);
            } else {
                // 如果没有自定义处理方法，默认调用 window.history.go(-1);
                this._handles.push(this.back);
            }
        }
        componentWillUnmount () {
            window.removeEventListener('popstate', this.handlePopstate);
        }
        // 触发一次popstate方法，则调用最新处理方法
        handlePopstate = () => {
            const handle = this._handles.pop();
            handle && handle();
        }
        // 通过调用push方法，新增一条历史记录，并添加对应处理方法
        push = (state, handle) => {
            if (handle) {
                history.pushState(state, null, location.href);
                this._handles.push(handle);
            }
        }
        render () {
            return (
                <Target {...this.props} _android_back_push={this.push}/>
            );
        }
    };
};
```

实现原理基本在注释中注明，在这就不详细叙述了，所有代码在 [h5_android_back](https://github.com/HuJiaoHJ/h5_android_back) 仓库中

## 使用

两种方式：

1、将对象挂在window上，支持任意页面接入，使用如下：

**index.js**

```JavaScript
// 监听Android物理返回键，自定义处理方法
window.AndroidBack.listen(() => {
    console.log('back');
});
// 新增Android物理返回键监听事件，使用场景，比如：页面内弹出浮层，点击Android物理返回键，不是回退页面，而是关闭浮层
window.AndroidBack.push('close_modal', () => {
    // 关闭弹窗
    console.log('close_modal');
});
```

2、封装了React高阶组件，支持React项目接入，使用如下：

**index_react.js**

```JavaScript
import * as React from 'react';
import AndroidBack from 'h5_android_back/index_react.js';

class App extends React.Component {
    // ...
    openModal = () => {
        // 新增Android物理返回键监听事件，使用场景，比如：页面内弹出浮层，点击Android物理返回键，不是回退页面，而是关闭浮层
        this.props._android_back_push('close_modal', () => {
            // 关闭弹窗
            console.log('close_modal');
        });
    }
}

// 监听Android物理返回键，自定义处理方法
export default AndroidBack(App, () => {
    console.log('back');
})
```

### 写在最后

> 注：此方案使用于所有浏览器及默认行为是页面回退的webview

此方案在我平时工作中使用正常，希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)