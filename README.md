# QuantWorker MQL Format

[中文說明 (简体中文)](./README.zh-cn.md) | [繁體中文說明](./README.zh-tw.md)

A VSCode extension that provides built-in code formatting, designed to enhance the MQL4/MQL5 development experience. It automatically replaces the C++ style arrow operator (`->`) with a dot operator (`.`) as you type.

## Features

*   **Automatic C++ Mode for IntelliSense**: Automatically sets the language mode to C++ for MQL files (`.mq4`, `.mq5`, `.mqh`), enabling powerful C++ IntelliSense, error checking, and code navigation.
*   **Real-time Replacement**: Automatically converts `->` to `.` in `.mq4`, `.mq5`, and `.mqh` files.
*   **Color Literal Fix**: Automatically corrects MQL color literal formatting (e.g., `C '253,253,253'` to `C'253,253,253'`) after formatting, preventing unwanted spaces.
*   **Date/Time Literal Fix**: Automatically corrects MQL date/time literal formatting (e.g., `D '2024.01.01 12:00'` to `D'2024.01.01 12:00'`).
*   **Type Conversion**: Automatically converts `size_t` to `int`, which is useful when porting C++ code to MQL5.
*   **Smart Detection**: The replacement happens instantly as you type, no manual trigger needed, boosting your coding efficiency.

<!-- It's highly recommended to record a GIF to demonstrate the feature and replace this comment -->

## Usage

After installing this extension, it will be automatically activated when you open any MQL-related file.

When you type code like this:

```mql
CTrade* trade;
// ...
if (trade->Select(ticket))
```

The `->` will be immediately converted to `.`:

```mql
CTrade* trade;
// ...
if (trade.Select(ticket))
```

## Extension Settings

This extension contributes the following settings:

*   `quantworker-mql-format.useBundledClangFormat`: When enabled, the 'MQL5 Format' command will use the extension's bundled `.clang-format` file for consistent formatting. **To use your own `.clang-format` file, disable this option and place your file in the root of your workspace.** When disabled, the command falls back to using your user-defined default formatter (which, if it's the C/C++ extension, will automatically detect your `.clang-format` file). Default is `true`.
*   `quantworker-mql-format.scanLimit`: The number of characters to scan backwards from the cursor for real-time replacements during typing. Default is `100`.
*   `quantworker-mql-format.debug`: Enables detailed debug logging in the output channel. Default is `false`.
*   `quantworker-mql-format.forceCppMode`: Automatically set the language mode to 'C++' for MQL files to enable IntelliSense. Disable this if you prefer to manage language modes manually. Default is `true`.

## How it Works
This extension provides two main features:
1.  **Format and Replace (MQL5 Format)**: This is the primary command for full-file replacements. It performs a two-step process:
    1.  It first runs a formatter on the document. By default (`useBundledClangFormat: true`), it uses its own `.clang-format` configuration to ensure consistent code style, regardless of your personal settings. This requires the Microsoft C/C++ extension (`ms-vscode.cpptools`) to be installed. If you disable this option, it will fall back to using your configured **default formatter**.
    2.  It then immediately runs this extension's replacement logic (e.g., `->` to `.`).

    You can trigger this command in several ways:
    *   **Right-click** in the editor and select **MQL5 Format**.
    *   Open the **Command Palette** (`Ctrl+Shift+P`) and search for `MQL5 Format`.
    *   Assign a **custom keyboard shortcut** to the `quantworker-mql-format.formatAndReplace` command. A common practice is to override the default format shortcut (`Shift+Alt+F`).
2.  **As You Type**: For convenience, it also performs these replacements in real-time as you type.

## Update History
*   The formatter can be triggered by ClangFormat, complying with C++ standards.
*   Added automatic replacement of `->` to `.` to avoid MQL syntax errors when editing in C++ mode within VSCode.
*   Added automatic replacement of `size_t` to `int` to avoid MQL syntax errors when editing in C++ mode within VSCode.
*   Automatic correction feature for MQL color literal format (e.g., `C '...'` to `C'...'`).
*   Automatic correction feature for MQL date/time literal format (e.g., `D '...'` to `D'...'`).
  
## Author

**QuantWorker**

*   GitHub: [QuantWorker/QuantWorker-Mql-Format](https://github.com/QuantWorker/QuantWorker-Mql-Format)
*   Facebook: [QuantWorker](https://facebook.com/QuantWorker)
*   Email: <QuantWorker@gmail.com>

---

**Enjoy!**