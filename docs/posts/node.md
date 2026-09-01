---
title: 如何下载 Node.js
date: '2026-09-01'
tags:
  - Vibe Coding
excerpt: 小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1小白也能安装 Node 1
cover: https://tutorial-blog-1308002460.cos.ap-chengdu.myqcloud.com/uploads/2026/09/9ff06891-7b64-4f8c-88a0-38b943ea946e.png
draft: false
pinned: true
---

安装 Node.js 最主流和推荐的方式是使用官方安装包，此外对于特定场景也有更专业的方案。这里有几种主要方式可以参考：

### 💻 方式一：使用官方安装包（最推荐）

这是最简单直接的方法，适合绝大多数用户，特别是刚接触 Node.js 的初学者。

\*\*1. 下载安装包\*\*

\*   访问 Node.js 官网 \[[https://nodejs.org/\](https://nodejs.org/)](https://nodejs.org/](https://nodejs.org/)) 下载。

   *版本选择：推荐点击左侧的* \*LTS（长期支持版）\*\* 按钮，它更稳定，适合大多数开发场景；右侧的 Current 版本包含最新特性，仅供尝鲜。

\*\*2. 运行安装\*\*

\*   双击下载的 `.msi` (Windows) 或 `.pkg` (macOS) 文件，按照安装向导的提示操作。

\*   有几个关键地方需要注意：

    \*   \*\*安装路径\*\*：可以修改到非系统盘（如 `D:\nodejs`），避免占用C盘空间；路径中不要包含中文或空格。

    \*   \*\*核心组件\*\*：务必确保 \*\*`Add to PATH`\*\* 选项被勾选，这能帮你自动配置好环境变量。

    \*   \*\*额外工具\*\*：如果提示安装 Python 或 Visual Studio Build Tools，对初学者来说可以先跳过，有需要时再安装。

\*\*3. 验证安装\*\*

安装完成后，打开命令行工具（Win+R，输入 `cmd`），分别输入以下命令，如果能看到版本号，就说明安装成功了：

\`\`\`bash

node -v

npm -v

\`\`\`

### 🚀 方式二：使用 nvm-windows 管理多个版本（进阶推荐）

当参与不同项目，需要频繁切换 Node.js 版本时，建议使用版本管理工具，这样可以避免版本冲突。

\*   \*\*核心思路\*\*：先安装 `nvm-windows`，再通过它来安装和管理任意版本的 Node.js。这能让你在不同版本的 Node.js 之间轻松切换。

\*   \*\*特别提醒\*\*：在安装 nvm-windows 之前，\*\*需要先手动卸载电脑上已有的任何 Node.js 版本\*\*，以免发生冲突。

### 🐧 方式三：在 Linux 系统上安装

Linux 用户（如 Ubuntu/Debian）可以使用包管理器，推荐通过 NodeSource 仓库安装，以获取较新的版本：

\`\`\`bash

# 以 Ubuntu/Debian 安装 Node.js 20.x LTS 为例

curl -fsSL [https://deb.nodesource.com/setup\_20.x](https://deb.nodesource.com/setup_20.x) | sudo -E bash -

sudo apt-get install -y nodejs

\`\`\`

安装完成后，同样用 `node -v` 和 `npm -v` 来验证。

### ✨ 安装后的优化建议

安装完成后，有几项配置可以让后续开发更顺手：

1.  \*\*修改全局包路径\*\*：默认情况下，通过 `npm install -g` 安装的全局工具会放在 C 盘。为了避免占用系统盘空间，可以在 Node.js 安装目录下新建 `node_global` 和 `node_cache` 两个文件夹，然后用命令重新指定路径。

    \`\`\`bash

    npm config set prefix "你的Node.js安装路径\\node\_global"

    npm config set cache "你的Node.js安装路径\\node\_cache"

    \`\`\`

2.  \*\*配置国内镜像源\*\*：由于官方源在国外，下载包可能很慢。可以切换到淘宝镜像源来加速。

    \`\`\`bash

    npm config set registry [https://registry.npmmirror.com](https://registry.npmmirror.com)

    \`\`\`
