# QuantWorker MQL Format

一个 VSCode 扩充功能，提供内置的代码格式化能力，旨在提升 MQL4/MQL5 的开发体验。它会在您打字时，自动将 C++ 风格的箭头运算子 (`->`) 替换为点运算子 (`.`)。

## 功能特色

*   **自动 C++ 模式以启用 IntelliSense**：自动为 MQL 文件（`.mq4`, `.mq5`, `.mqh`）设置 C++ 语言模式，以启用强大的 C++ 智能感知（IntelliSense）、错误检查和代码导航功能。
*   **即时替换**：在 `.mq4`, `.mq5`, 和 `.mqh` 档案中自动将 `->` 转换为 `.`。
*   **颜色字面值修正**：自动修正 MQL 颜色字面值格式（例如，将 `C '253,253,253'` 修正为 `C'253,253,253'`），防止格式化后出现多余空格。
*   **日期时间字面值修正**：自动修正 MQL 日期时间字面值格式（例如，将 `D '2024.01.01 12:00'` 修正为 `D'2024.01.01 12:00'`）。
*   **类型转换**：自动将 `size_t` 转换为 `int`，这在将 C++ 代码移植到 MQL5 时非常有用。
*   **智慧侦测**：替换在您输入的当下立即发生，无须手动触发，提升您的编码效率。

  <!-- 建议您录制一个 GIF 动图来展示效果，并替换此连结 -->

## 如何使用

安装此外挂后，当您开启 MQL 相关档案时，它将会自动启用。

当您输入像这样的程式码时：

```mql
CTrade* trade;
// ...
if (trade->Select(ticket))
```

`->` 会被立即转换为 `.`：

```mql
CTrade* trade;
// ...
if (trade.Select(ticket))
```

## 外挂设定

此外挂提供以下设定项目：

*   `quantworker-mql-format.useBundledClangFormat`：启用后，‘MQL5 格式化’命令将使用扩展插件内置的 `.clang-format` 文件来确保格式化风格一致。**若要使用您自己的 `.clang-format` 文件，请禁用此选项，并将您的文件放置于工作区的根目录。** 禁用后，此命令会退回使用您自定义的默认格式化工具（如果该工具是 C/C++ 扩展，它会自动侦测您的 `.clang-format` 文件）。预设值为 `true`。
*   `quantworker-mql-format.scanLimit`：在输入文字时，从游标位置向后扫描以进行即时替换的字元数。预设值为 `100`。
*   `quantworker-mql-format.debug`：在输出频道中启用详细的除错日志。预设值为 `false`。
*   `quantworker-mql-format.forceCppMode`：为 MQL 文件自动设置 C++ 语言模式以启用 IntelliSense。如果您偏好手动管理语言模式，请禁用此选项。预设值为 `true`。

## 运作方式
此外挂提供两项主要功能：
1.  **格式化并替换 (MQL5 格式化)**：这是用于全局替换的主要命令。它会执行一个两步骤流程：
    1.  首先，它会对文件进行格式化。在预设情况下 (`useBundledClangFormat: true`)，它会使用自身内建的 `.clang-format` 设定档来确保一致的程式码风格，这需要您安装微软的 C/C++ 扩充功能 (`ms-vscode.cpptools`)。如果您停用此选项，它将退回使用您所设定的**预设格式化工具**。
    2.  然后，它会立即执行此外挂的替换逻辑（例如 `->` 转换为 `.`）。

    您可以通过以下几种方式触发此命令：
    *   在编辑器中**按下鼠标右键**，选择 **MQL5 格式化**。
    *   打开**命令面板**（`Ctrl+Shift+P`）并搜寻 `MQL5 格式化`。
    *   为 `quantworker-mql-format.formatAndReplace` 命令指定一个**自订键盘快速键**。一个常见的做法是覆盖预设的格式化快速键（`Shift+Alt+F`）。
2.  **即时替换**：为了方便起见，它也会在您打字时即时进行替换。

## 更新项目
*   格式化工具可使用 ClangFormat 触发，符合 C++ 标准。
*   新增 `->` 至 `.` 的自动替换功能，以避免在 VSCode 的 C++ 模式下编辑时产生 MQL 语法错误。
*   新增 `size_t` 至 `int` 的自动替换功能，以避免在 VSCode 的 C++ 模式下编辑时产生 MQL 语法错误。
*   MQL 颜色字面值格式的自动修正功能（例如，将 `C '...'` 修正为 `C'...'`）。
*   MQL 时间字面值格式的自动修正功能（例如，将 `D '...'` 修正为 `D'...'`）。
  
## 作者

**QuantWorker**

*   GitHub: [QuantWorker/QuantWorker-Mql-Format](https://github.com/QuantWorker/QuantWorker-Mql-Format)
*   Facebook: [QuantWorker](https://facebook.com/QuantWorker)
*   电子邮箱: <QuantWorker@gmail.com>

---

**Enjoy!**