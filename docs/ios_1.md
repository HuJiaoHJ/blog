# iOS入门（一）使用CocoaPods做依赖管理

CocoaPods 是专门为iOS工程提供对第三方库的依赖的管理工具。

官网：https://cocoapods.org/

在安装 CocoaPods 时，会接触几个名词：ruby、rvm、gem、bundle，首先来看看这些都是什么

## ruby、rvm、gem、bundler是什么？

ruby 是一种开源的面向对象程序设计的服务器端脚本语言。

[rvm](https://rvm.io/) 是一个命令行工具，可以提供一个便捷的多版本 Ruby 环境的管理和切换。

mac os 本身自带 ruby，可以通过 `ruby -v` 查看当前安装版本，如需更新，可以通过 rvm 进行更新

```bash
# 安装 rvm
$ \curl -sSL https://get.rvm.io | bash -s stable
$ source ~/.bashrc
$ source ~/.bash_profile

# 列出已知的ruby版本
$ rvm list known
# 安装特定版本ruby
$ rvm install 2.5.0
# 切换ruby版本
$ rvm use 2.5.0
# 列出已安装的ruby版本
$ rvm list
# 卸载已安装版本
$ rvm remove 2.5.0
```

RubyGems 是 Ruby 的一个包管理器，它提供一个分发 Ruby 程序和库的标准格式，还提供一个管理程序包安装的工具。RubyGems 旨在方便地管理 gem 安装的工具，以及用于分发 gem 的服务器。

Gem 是 Ruby 模块 (叫做 Gems) 的包管理器。其包含包信息，以及用于安装的文件。其功能跟npm等包管理器类似。

```bash
# 安装
$ gem install mygem
# 卸载
$ gem uninstall mygem
# 列出已安装的gem
$ gem list --local
# 列出可用的gem
$ gem list --remote
# 为所有的gems创建RDoc文档
$ gem rdoc --all
# 下载一个gem，但不安装
$ gem fetch mygem
#从可用的gem中搜索
$ gem search STRING --remote
```

为了加快下载安装速度，可以修改为国内源

```bash
# 查看当前源
$ gem sources -l
# 删除默认源
$ gem sources --remove https://rubygems.org/
# 添加国内淘宝源
$ gem sources -a https://gems.ruby-china.org/
```

bundler 则是一个Gem包。相等于多个RubyGems批处理运行。在配置文件gemfile里声明应用依赖的第三方包，会自动下载安装多个包，并且会下载这些包依赖的包。

```bash
# 使用gem安装bundler
$ gem install bundler
# 在应用根目录下执行，生成 Gemfile
$ bundle init
# 在 Gemfile 中声明依赖的第三方包，执行以下命令进行安装，会生成一个版本快照文件 Gemfile.lock
$ bundle install
# 或
$ bundle
```

## CocoaPods 使用

CocoaPods 是一个Gem包，是为iOS工程提供对第三方库的依赖的管理工具。所以可以直接通过gem进行安装，也可以使用bundle进行管理。

官网：https://cocoapods.org/

```bash
# 直接通过gem安装
$ sudo gem install cocoapods
# 将 cocoapods 在 Gemfile 文件中进行声明，使用 bundle 进行安装
$ bundle install

# 在项目根目录下执行，生成 Podfile 文件，用于声明工程依赖的第三方库
$ pod init
```

Podfile 格式如下：

```
platform :ios, '8.0'
use_frameworks!

target 'MyApp' do
  pod 'AFNetworking', '~> 2.6'
  pod 'ORStackView', '~> 3.0'
  pod 'SwiftyJSON', '~> 2.3'
end
```

在 Podfile 中声明所依赖的第三方库，执行：`pod install`，执行完之后，会生成 Podfile.lock 文件，用于锁定当前各依赖的版本。多次执行 `pod install` 不会更改版本，只有执行 `pod update` 才会更新 Podfile.lock 文件

```bash
# 搜索第三方库
$ pod search json
```

添加第三方库，可以直接修改 Podfile 文件，执行：

```bash
# 更新依赖
$ pod update
```

### podspec 文件

cocoapods的配置文件就是一个 *.podspec的文件，通过如下命令初始化一个podspec文件：

```bash
pod spec create your_pod_spec_name
```

CocoaPods 会生成一个名为your_pod_spec_name.podspec的文件，然后我们修改其中的相关内容即可。

具体可以参考：[《Cocoapods 入门》](http://studentdeng.github.io/blog/2013/09/13/cocoapods-tutorial/)

## 写在最后

希望能对有需要的小伙伴有帮助~~~

喜欢我的文章的小伙伴可以点star ⭐️

欢迎关注 [我的掘金](https://juejin.im/user/56dfa4391532bc00515e13d9/posts)、[我的知乎](https://www.zhihu.com/people/hu-jiao-36-21/posts)