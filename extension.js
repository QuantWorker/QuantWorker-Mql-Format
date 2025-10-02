// 'vscode' 模組包含了 VS Code 的擴充功能 API
const vscode = require('vscode');

// 一個旗標，用來防止擴充功能自身的編輯行為造成無限循環。
let isApplyingEdit = false;
// 一個計時器，用來對打字操作進行防抖處理。
let typingDebounceTimer = null;
// 一個輸出頻道，用於記錄日誌以幫助診斷時序問題。
let outputChannel;
// 儲存擴充功能的上下文，以便在其他地方存取擴充功能的路徑等資訊。
let extensionContext;

/**
 * 當擴充功能被啟動時，會呼叫此函式。
 * @param {vscode.ExtensionContext} context
 */
function activate(context)
{
    extensionContext = context; // 儲存上下文
    // 建立一個輸出頻道，用於記錄日誌。這對除錯很有幫助。
    outputChannel = vscode.window.createOutputChannel("QuantWorker MQL Format");
    logVerbose('QuantWorker MQL Format is now active!');

    // --- 新功能：確保 MQL 檔案使用 C++ 語言模式 ---
    const initialConfig = vscode.workspace.getConfiguration('quantworker-mql-format');
    if (initialConfig.get('forceCppMode', true))
    {
        // 檢查目前已開啟的文件
        vscode.workspace.textDocuments.forEach(ensureCppMode);

        // 監聽未來開啟的文件
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(ensureCppMode)
        );
        logVerbose(`[Mode Setter] Activated. MQL files will be treated as C++.`);
    } else
    {
        logVerbose(`[Mode Setter] Deactivated by user setting.`);
    }

    // --- 監聽器 1：處理輸入時的變更（小範圍掃描） ---
    const changeHandler = (event) =>
    { // 傳入 event 物件
        // 徹底移除所有複雜的「猜測」邏輯。
        // 現在，任何即時的文字變更（打字、貼上、按 Enter 等）都只會觸發小範圍的局部掃描。
        // 這可以確保除了「格式化文件」操作之外，任何按鍵都不會觸發全文件掃描。
        if (typingDebounceTimer)
        {
            clearTimeout(typingDebounceTimer);
        }
        typingDebounceTimer = setTimeout(() =>
        {
            processTypingChanges(event);
        }, 250);
    };

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event =>
        {
            // 只處理檔案系統中的文件變更。
            // 這可以防止擴充功能對自己的日誌輸出產生反應，從而避免無限循環。
            if (event.document.uri.scheme !== 'file')
            {
                return;
            }

            const reason = event.reason === vscode.TextDocumentChangeReason.Undo ? 'Undo' : event.reason === vscode.TextDocumentChangeReason.Redo ? 'Redo' : 'Edit';
            logVerbose(`[EVENT] onDidChangeTextDocument fired. Reason: ${reason}. isApplyingEdit: ${isApplyingEdit}`);
            // 忽略我們自己的編輯以及復原/重做操作。
            if (isApplyingEdit || event.reason === vscode.TextDocumentChangeReason.Undo || event.reason === vscode.TextDocumentChangeReason.Redo)
            {
                logVerbose(` -> Ignoring this event.`);
                return;
            }
            // 不要處理空的變更，這種情況有時會被觸發。
            if (event.contentChanges.length === 0)
            {
                return;
            }
            changeHandler(event);
        })
    );

    // --- 手動命令：從右鍵選單觸發 ---
    const disposableCommand = vscode.commands.registerCommand('quantworker-mql-format.forceApplyReplacements', async () =>
    {
        const editor = vscode.window.activeTextEditor;
        if (editor)
        {
            const config = vscode.workspace.getConfiguration('quantworker-mql-format');
            if (config.get('debug', false))
            {
                outputChannel.show(true); // 確保面板可見
            }
            logVerbose(`[COMMAND] Manually triggered replacement for: ${editor.document.uri.fsPath}`);
            await runFullReplacement(editor);
        } else
        {
            vscode.window.showInformationMessage('QuantWorker MQL Format: No active editor found to apply replacements.');
            if (outputChannel)
            {
                const config = vscode.workspace.getConfiguration('quantworker-mql-format');
                if (config.get('debug', false))
                {
                    outputChannel.show(true);
                }
                logVerbose(`[COMMAND] Manual trigger failed: No active editor was found.`);
            }
        }
    });

    // --- 新的複合命令：格式化並替換 ---
    const formatAndReplaceCommand = vscode.commands.registerCommand('quantworker-mql-format.formatAndReplace', async () =>
    {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
        {
            vscode.window.showInformationMessage('QuantWorker MQL Format: No active editor found to run the command.');
            return;
        }

        const config = vscode.workspace.getConfiguration('quantworker-mql-format');
        if (config.get('debug', false))
        {
            outputChannel.show(true);
        }
        logVerbose(`[COMMAND] Running 'Format and Replace' for: ${editor.document.uri.fsPath}`);

        const document = editor.document;

        try
        {
            const useBundledFormatter = config.get('useBundledClangFormat', true);

            if (useBundledFormatter)
            {
                logVerbose(` -> Step 1: Using bundled .clang-format to format.`);
                const cppConfig = vscode.workspace.getConfiguration('C_Cpp', document.uri);

                const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
                const target = workspaceFolder ? vscode.ConfigurationTarget.WorkspaceFolder : vscode.ConfigurationTarget.Global;
                const targetName = workspaceFolder ? 'WorkspaceFolder' : 'Global';
                logVerbose(`   - Determined configuration target: ${targetName}`);

                const originalStyle = cppConfig.inspect('clang_format_style');
                const originalFormatting = cppConfig.inspect('formatting');
                let originalStyleValue, originalFormattingValue;

                if (workspaceFolder)
                {
                    originalStyleValue = originalStyle ? originalStyle.workspaceFolderValue : undefined;
                    originalFormattingValue = originalFormatting ? originalFormatting.workspaceFolderValue : undefined;
                } else
                {
                    originalStyleValue = originalStyle ? originalStyle.globalValue : undefined;
                    originalFormattingValue = originalFormatting ? originalFormatting.globalValue : undefined;
                }

                try
                {
                    const bundledClangFormatPath = vscode.Uri.joinPath(extensionContext.extensionUri, '.clang-format').fsPath;
                    const newStyleSetting = `file:${bundledClangFormatPath}`;

                    logVerbose(`   - Temporarily setting 'C_Cpp.formatting' to 'clangFormat'.`);
                    await cppConfig.update('formatting', 'clangFormat', target);

                    logVerbose(`   - Temporarily setting 'C_Cpp.clang_format_style' to '${newStyleSetting}'.`);
                    await cppConfig.update('clang_format_style', newStyleSetting, target);

                    await vscode.commands.executeCommand('editor.action.formatDocument');
                } catch (err)
                {
                    logVerbose(`[ERROR] Formatting with bundled config failed: ${err}`);
                    vscode.window.showErrorMessage(`QuantWorker MQL Format: Formatting failed. Please check if the 'C/C++' extension (ms-vscode.cpptools) is installed and enabled.`);
                } finally
                {
                    logVerbose(`   - Restoring original C/C++ formatting settings.`);
                    await cppConfig.update('clang_format_style', originalStyleValue, target);
                    await cppConfig.update('formatting', originalFormattingValue, target);
                    logVerbose(`   - Settings restored.`);
                }
            } else
            {
                logVerbose(` -> Step 1: Attempting to execute user's default formatter...`);
                const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
                const defaultFormatter = editorConfig.get('defaultFormatter');

                if (defaultFormatter)
                {
                    logVerbose(`   - Found default formatter '${defaultFormatter}'. Executing 'editor.action.formatDocument'.`);
                    await vscode.commands.executeCommand('editor.action.formatDocument');
                } else
                {
                    logVerbose(`   - No default formatter configured by user. Skipping format step.`);
                }
            }
        } catch (err)
        {
            logVerbose(`[ERROR] An unexpected error occurred during the format-and-replace process: ${err}`);
            vscode.window.showErrorMessage(`QuantWorker MQL Format: An unexpected error occurred. See output for details.`);
        } finally
        { }

        // 在格式化後稍微延遲，確保文件變更已完全套用，避免競爭條件
        await new Promise(resolve => setTimeout(resolve, 100));

        // 步驟 2: 執行我們的全局替換邏輯
        logVerbose(` -> Step 2: Executing custom replacements (->, size_t, etc.)...`);
        await runFullReplacement(editor);

        logVerbose(`[COMMAND] 'Format and Replace' finished.`);
    });

    context.subscriptions.push(disposableCommand, formatAndReplaceCommand);
    context.subscriptions.push(outputChannel);
}

/**
 * 使用小範圍的局部掃描來處理與打字相關的變更。
 * @param {vscode.TextDocumentChangeEvent} event 文件變更事件。
 */
async function runFullReplacement(editor)
{
    const document = editor.document;
    const langId = document.languageId;
    const fileName = document.fileName;

    const isMqlFileAsCpp = langId === 'cpp' && (fileName.endsWith('.mq4') || fileName.endsWith('.mq5') || fileName.endsWith('.mqh'));

    if (!isMqlFileAsCpp)
    {
        logVerbose(`[COMMAND] Aborted: Not a valid MQL file.`);
        return;
    }

    logVerbose(`[${new Date().toLocaleTimeString()}] [Full Scan] Document is a valid MQL file. Searching for fixes...`);
    const edits = getDocumentFixes(document);
    await applyReplacements(editor, edits);
}

/**
 * 使用小範圍的局部掃描來處理與打字相關的變更。
 * @param {vscode.TextDocumentChangeEvent} event 文件變更事件。
 */
async function processTypingChanges(event)
{
    // 只有在啟用詳細日誌時才輸出此訊息，保持輸出面板乾淨。
    logVerbose(`[${new Date().toLocaleTimeString()}] [onChange] Debounced change triggered. Processing typing changes for: ${event.document.uri.fsPath}`);

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document)
    {
        return;
    }

    // 在繼續之前，確保是有效的檔案類型
    const { document } = event;
    const langId = document.languageId;
    const fileName = document.fileName;
    const isMqlFileAsCpp = langId === 'cpp' && (fileName.endsWith('.mq4') || fileName.endsWith('.mq5') || fileName.endsWith('.mqh'));

    if (!isMqlFileAsCpp)
    {
        return;
    }

    const edits = getTypingFixes(event);
    await applyReplacements(editor, edits);
}

/**
 * 將一系列文字編輯套用到文件中，並處理冷卻邏輯。
 * @param {vscode.TextEditor} editor 當前作用中的文字編輯器。
 * @param {{range: vscode.Range, newText: string}[]} edits 要套用的編輯。
 */
async function applyReplacements(editor, edits)
{
    if (isApplyingEdit || edits.length === 0)
    {
        return;
    }

    const document = editor.document;
    logVerbose(`[${new Date().toLocaleTimeString()}] Found ${edits.length} potential fixes. Applying...`);
    isApplyingEdit = true;
    try
    {
        const success = await editor.edit(editBuilder =>
        {
            for (const edit of edits)
            {
                logVerbose(`  - Replacing '${document.getText(edit.range)}' with '${edit.newText}' at line ${edit.range.start.line + 1}`);
                editBuilder.replace(edit.range, edit.newText);
            }
        });

        if (success)
        {
            logVerbose(`Edits applied successfully.`);
        } else
        {
            logVerbose(`[${new Date().toLocaleTimeString()}] Edits failed to apply. This might be due to a conflict with another extension.`);
        }
    } catch (error)
    {
        logVerbose(`[${new Date().toLocaleTimeString()}] Error applying auto-replacements: ${error}`);
        console.error('Failed to apply auto-replacements:', error);
    } finally
    {
        // 開始一段「冷卻」時間。
        // 在此期間，isApplyingEdit 保持為 true，因此我們會忽略任何
        // 來自其他格式化工具的即時「修正」編輯，從而打破無限循環。
        const cooldownMs = 500;
        logVerbose(`Starting ${cooldownMs}ms cooldown to prevent feedback loop.`);
        setTimeout(() =>
        {
            isApplyingEdit = false;
            logVerbose(`Cooldown finished. Ready for new events.`);
        }, cooldownMs);
    }
}

/**
 * 在小範圍內尋找並建立用於打字事件的替換編輯。
 * @param {vscode.TextDocumentChangeEvent} event 文件變更事件。
 * @returns {{range: vscode.Range, newText: string}[]} 一個包含替換物件的陣列。
 */
function getTypingFixes(event)
{
    const replacements = [];
    const document = event.document;
    const config = vscode.workspace.getConfiguration('quantworker-mql-format');
    const scanLimit = config.get('scanLimit', 100);
    const combinedRegex = /(->)|([CcDd])([ \t\u00A0]+)'|\b(size_t)\b/g;

    for (const change of event.contentChanges)
    {
        // 只處理有插入文字的變更 (例如打字、貼上)。忽略純刪除操作。
        if (change.text === '')
        {
            continue;
        }

        const line = document.lineAt(change.range.start.line);
        const commentIndex = line.text.indexOf('//');

        // 定義要掃描的範圍：從變更位置向後掃描 scanLimit 個字元。
        const endPosition = change.range.start.translate(0, change.text.length);
        const startChar = Math.max(0, endPosition.character - scanLimit);
        const scanRange = new vscode.Range(endPosition.line, startChar, endPosition.line, endPosition.character);
        const textToScan = document.getText(scanRange);

        let match;
        while ((match = combinedRegex.exec(textToScan)) !== null)
        {
            const matchStartInLine = scanRange.start.character + match.index;

            // 如果有註解，確保我們的匹配項在註解之前。
            if (commentIndex !== -1 && matchStartInLine >= commentIndex)
            {
                continue;
            }

            const startPos = new vscode.Position(scanRange.start.line, matchStartInLine);
            const endPos = new vscode.Position(scanRange.start.line, matchStartInLine + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            let newText = '';
            if (match[1])
            { // 匹配到群組 1：是箭頭 '->'
                logVerbose(`[Typing] Found '->' at line ${startPos.line + 1}, char ${startPos.character}. Queuing for replacement.`);
                newText = '.';
            } else if (match[2])
            { // 匹配到群組 2：是顏色或日期時間字面值
                newText = `${match[2]}'`; // match[2] 是 'C', 'c', 'D', 或 'd'
            } else if (match[4])
            { // 匹配到群組 4: 是 'size_t'
                logVerbose(`[Typing] Found 'size_t' at line ${startPos.line + 1}, char ${startPos.character}. Queuing for replacement.`);
                newText = 'int';
            }

            if (newText)
            {
                // 避免對同一個範圍重複排入編輯。
                if (!replacements.some(e => e.range.isEqual(range)))
                {
                    replacements.push({ range, newText });
                }
            }
        }
    }
    return replacements;
}

/**
 * 在一次傳遞中尋找並建立所有支援的替換編輯（箭頭和顏色字面值）（全文件掃描）。
 * 此函式會掃描整個文件並忽略註解中的出現次數。
 * @param {vscode.TextDocument} document 要掃描的文件。
 * @returns {{range: vscode.Range, newText: string}[]} 一個包含替換物件的陣列。
 */
function getDocumentFixes(document)
{
    const replacements = [];
    const lineCount = document.lineCount;

    // 組合的正則表達式：
    // 群組 1: (->) - 箭頭運算子
    // 群組 2: ([CcDd]) - 用於顏色/日期時間字面值的 'C', 'c', 'D', 或 'd'
    // 群組 3: ([ \t\u00A0]+) - 'C'/'D' 等字元後面的空白字元
    // 群組 4: (size_t) - size_t 類型
    const combinedRegex = /(->)|([CcDd])([ \t\u00A0]+)'|\b(size_t)\b/g;

    for (let i = 0; i < lineCount; i++)
    {
        const line = document.lineAt(i);
        const originalText = line.text;

        // 為避免替換註解內的內容，我們只在程式碼部分進行搜尋。
        const commentIndex = originalText.indexOf('//');
        const textToSearch = commentIndex !== -1 ? originalText.substring(0, commentIndex) : originalText;

        let match;
        while ((match = combinedRegex.exec(textToSearch)) !== null)
        {
            const startPos = new vscode.Position(i, match.index);
            const endPos = new vscode.Position(i, match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            let newText = '';

            if (match[1])
            { // 匹配到群組 1：是箭頭 '->'
                logVerbose(`Found '->' at line ${i + 1}, char ${match.index}. Queuing for replacement.`);
                newText = '.';
            } else if (match[2])
            { // 匹配到群組 2：是顏色或日期時間字面值
                newText = `${match[2]}'`; // match[2] 是 'C', 'c', 'D', 或 'd'
            } else if (match[4])
            { // 匹配到群組 4: 是 'size_t'
                logVerbose(`Found 'size_t' at line ${i + 1}, char ${match.index}. Queuing for replacement.`);
                newText = 'int';
            }

            if (newText)
            {
                replacements.push({ range, newText });
            }
        }
    }
    return replacements;
}

/**
 * 確保 MQL 檔案被設定為 C++ 語言模式以啟用 Intellisense。
 * @param {vscode.TextDocument} document 要檢查的文件。
 */
async function ensureCppMode(document)
{
    if (!document || document.uri.scheme !== 'file')
    {
        return;
    }

    const fileName = document.fileName;
    const isMqlFile = fileName.endsWith('.mq4') || fileName.endsWith('.mq5') || fileName.endsWith('.mqh');

    if (isMqlFile && document.languageId !== 'cpp')
    {
        logVerbose(`[Mode Setter] Forcing language mode to 'cpp' for ${fileName}`);
        await vscode.languages.setTextDocumentLanguage(document, 'cpp');
    }
}
/**
 * 根據設定有條件地記錄除錯訊息。
 * @param {string} message 要記錄的訊息。
 */
function logVerbose(message)
{
    const config = vscode.workspace.getConfiguration('quantworker-mql-format');
    const debugMode = config.get('debug', false);

    if (debugMode)
    {
        outputChannel.appendLine(message);
    }
}

// 當您的擴充功能被停用時，會呼叫此函式
function deactivate()
{
    if (outputChannel)
    {
        outputChannel.dispose();
    }
    console.log('QuantWorker MQL Format has been deactivated.');
}

module.exports = {
    activate,
    deactivate
}
