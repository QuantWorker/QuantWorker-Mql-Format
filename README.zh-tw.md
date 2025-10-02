# QuantWorker MQL Format

一個 VSCode 擴充功能，提供內建的程式碼格式化能力，旨在提升 MQL4/MQL5 的開發體驗。它會在您打字時，自動將 C++ 風格的箭頭運算子 (`->`) 替換為點運算子 (`.`)。

## 功能特色

*   **自動 C++ 模式以啟用 IntelliSense**：自動為 MQL 檔案（`.mq4`, `.mq5`, `.mqh`）設定 C++ 語言模式，以啟用強大的 C++ 智慧感知（IntelliSense）、錯誤檢查和程式碼導覽功能。
*   **即時替換**：在 `.mq4`, `.mq5`, 和 `.mqh` 檔案中自動將 `->` 轉換為 `.`。
*   **顏色字面值修正**：自動修正 MQL 顏色字面值格式（例如，將 `C '253,253,253'` 修正為 `C'253,253,253'`），防止格式化後出現多餘空格。
*   **日期時間字面值修正**：自動修正 MQL 日期時間字面值格式（例如，將 `D '2024.01.01 12:00'` 修正為 `D'2024.01.01 12:00'`）。
*   **型別轉換**：自動將 `size_t` 轉換為 `int`，這在從 C++ 移植程式碼到 MQL5 時非常實用。
*   **智慧偵測**：替換在您輸入的當下立即發生，無須手動觸發，提升您的編碼效率。

  <!-- 建議您錄製一個 GIF 動圖來展示效果，並替換此連結 -->

## 如何使用

安裝此外掛後，當您開啟 MQL 相關檔案時，它將會自動啟用。

當您輸入像這樣的程式碼時：

```mql
CTrade* trade;
// ...
if (trade->Select(ticket))
```

`->` 會被立即轉換為 `.`：

```mql
CTrade* trade;
// ...
if (trade.Select(ticket))
```

## 外掛設定

此外掛提供以下設定項目：

*   `quantworker-mql-format.useBundledClangFormat`：啟用後，『MQL5 格式化』命令將使用擴充功能內建的 `.clang-format` 檔案來確保格式化風格一致。**若要使用您自己的 `.clang-format` 檔案，請停用此選項，並將您的檔案放置於工作區的根目錄。** 停用後，此命令會退回使用您自訂的預設格式化工具（如果該工具是 C/C++ 擴充功能，它會自動偵測您的 `.clang-format` 檔案）。預設值為 `true`。
*   `quantworker-mql-format.scanLimit`：在輸入文字時，從游標位置向後掃描以進行即時取代的字元數。預設值為 `100`。
*   `quantworker-mql-format.debug`：在輸出頻道中啟用詳細的除錯日誌。預設值為 `false`。
*   `quantworker-mql-format.forceCppMode`：為 MQL 檔案自動設定 C++ 語言模式以啟用 IntelliSense。如果您偏好手動管理語言模式，請停用此選項。預設值為 `true`。

## 運作方式
此外掛提供兩項主要功能：
1.  **格式化並替換 (MQL5 格式化)**：這是用於全局替換的主要命令。它會執行一個兩步驟流程：
    1.  首先，它會對文件進行格式化。在預設情況下 (`useBundledClangFormat: true`)，它會使用自身內建的 `.clang-format` 設定檔來確保一致的程式碼風格，這需要您安裝微軟的 C/C++ 擴充功能 (`ms-vscode.cpptools`)。如果您停用此選項，它將退回使用您所設定的**預設格式化工具**。
    2.  然後，它會立即執行此外掛的替換邏輯（例如 `->` 轉換為 `.`）。

    您可以透過以下幾種方式觸發此命令：
    *   在編輯器中**按下滑鼠右鍵**，選擇 **MQL5 格式化**。
    *   開啟**命令面板**（`Ctrl+Shift+P`）並搜尋 `MQL5 格式化`。
    *   為 `quantworker-mql-format.formatAndReplace` 命令指定一個**自訂鍵盤快捷鍵**。一個常見的做法是覆蓋預設的格式化快捷鍵（`Shift+Alt+F`）。
2.  **即時替换**：為了方便起見，它也會在您打字時即時進行替換。

## 更新項目

*   格式化工具可使用 ClangFormat 觸發，符合C++標準。
*   VSCode裡使用C++模式編輯，避免MQL語法錯誤 `->` 至 `.` 的自動替換功能。
*   VSCode裡使用C++模式編輯，避免MQL語法錯誤 `size_t` 至 `int` 的自動替換功能。
*   MQL 顏色字面值格式的自動修正功能（例如，將 `C '...'` 修正為 `C'...'`）。
*   MQL 時間字面值格式的自動修正功能（例如，將 `D '...'` 修正為 `D'...'`）。
  
## 作者

**QuantWorker**

*   GitHub: [QuantWorker/QuantWorker-Mql-Format](https://github.com/QuantWorker/QuantWorker-Mql-Format)
*   Facebook: [QuantWorker](https://facebook.com/QuantWorker)
*   電子郵件: <QuantWorker@gmail.com>

---

**Enjoy!**