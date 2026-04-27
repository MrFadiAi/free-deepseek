# Tool call parsing semantics（Go/Node 统一语义）

本文档描述当前代码中的**实际行为**，以 `internal/toolcall`、`internal/toolstream` 与 `internal/js/helpers/stream-tool-sieve` 为准。

文档导航：[总览](../README.MD) / [架构说明](./ARCHITECTURE.md) / [测试指南](./TESTING.md)

## 1) 当前可执行格式

当前版本推荐模型输出 DSML 外壳：

```xml
<|DSML|tool_calls>
  <|DSML|invoke name="read_file">
    <|DSML|parameter name="path"><![CDATA[README.MD]]></|DSML|parameter>
  </|DSML|invoke>
</|DSML|tool_calls>
```

兼容层仍接受旧式 canonical XML：

```xml
<tool_calls>
  <invoke name="read_file">
    <parameter name="path"><![CDATA[README.MD]]></parameter>
  </invoke>
</tool_calls>
```

这不是原生 DSML 全链路实现。DSML 只作为 prompt 外壳和解析入口别名；进入 parser 前会被归一化成 `<tool_calls>` / `<invoke>` / `<parameter>`，内部仍以现有 XML 解析语义为准。

约束：

- 必须有 `<|DSML|tool_calls>...</|DSML|tool_calls>` 或 `<tool_calls>...</tool_calls>` wrapper
- 每个调用必须在 `<|DSML|invoke name="...">...</|DSML|invoke>` 或 `<invoke name="...">...</invoke>` 内
- 工具名必须放在 `invoke` 的 `name` 属性
- 参数必须使用 `<|DSML|parameter name="...">...</|DSML|parameter>` 或 `<parameter name="...">...</parameter>`
- 同一个工具块内不要混用 DSML 标签和旧 XML 工具标签；混搭会被视为非法工具块

兼容修复：

- 如果模型漏掉 opening wrapper，但后面仍输出了一个或多个 invoke 并以 closing wrapper 收尾，Go 解析链路会在解析前补回缺失的 opening wrapper。
- 如果模型把 DSML 标签里的分隔符 `|` 写漏成空格（例如 `<|DSML tool_calls>` / `<|DSML invoke>` / `<|DSML parameter>`，或无 leading pipe 的 `<DSML tool_calls>` 形态），或把 `DSML` 与工具标签名直接黏连（例如 `<DSMLtool_calls>` / `<DSMLinvoke>` / `<DSMLparameter>`），Go / Node 会在固定工具标签名范围内归一化；相似但非工具标签名（如 `tool_calls_extra`）仍按普通文本处理。
- 这是一个针对常见模型失误的窄修复，不改变推荐输出格式；prompt 仍要求模型直接输出完整 DSML 外壳。
- 裸 `<invoke ...>` / `<parameter ...>` 不会被当成“已支持的工具语法”；只有 `tool_calls` wrapper 或可修复的缺失 opening wrapper 才会进入工具调用路径。

## 2) 非兼容内容

任何不满足上述 DSML / canonical XML 形态的内容，都会保留为普通文本，不会执行。一个例外是上一节提到的“缺失 opening wrapper、但 closing wrapper 仍存在”的窄修复场景。

当前 parser 不把 allow-list 当作硬安全边界：即使传入了已声明工具名列表，XML 里出现未声明工具名时也会尽量解析并交给上层协议输出；真正的执行侧仍必须自行校验工具名和参数。

## 3) 流式与防泄漏行为

在流式链路中（Go / Node 一致）：

- DSML `<|DSML|tool_calls>` wrapper、兼容变体（`<dsml|tool_calls>`、`<｜tool_calls>`、`<|tool_calls>`）、窄容错空格分隔形态（如 `<|DSML tool_calls>`）、黏连形态（如 `<DSMLtool_calls>`）和 canonical `<tool_calls>` wrapper 都会进入结构化捕获
- 如果流里直接从 invoke 开始，但后面补上了 closing wrapper，Go 流式筛分也会按缺失 opening wrapper 的修复路径尝试恢复
- 已识别成功的工具调用不会再次回流到普通文本
- 不符合新格式的块不会执行，并继续按原样文本透传
- fenced code block（反引号 `` ``` `` 和波浪线 `~~~`）中的 XML 示例始终按普通文本处理
- 支持嵌套围栏（如 4 反引号嵌套 3 反引号）和 CDATA 内围栏保护
- 如果模型把 `<![CDATA[` 打开后却没有闭合，流式扫描阶段仍会保守地继续缓冲，不会误把 CDATA 里的示例 XML 当成真实工具调用；在最终 parse / flush 恢复阶段，会对这类 loose CDATA 做窄修复，尽量保住外层已完整包裹的真实工具调用
- 当文本中 mention 了某种标签名（如 `<dsml|tool_calls>` 或 Markdown inline code 里的 `<|DSML|tool_calls>`）而后面紧跟真正工具调用时，sieve 会跳过不可解析的 mention 候选并继续匹配后续真实工具块，不会因 mention 导致工具调用丢失，也不会截断 mention 后的正文

另外，`<parameter>` 的值如果本身是合法 JSON 字面量，也会按结构化值解析，而不是一律保留为字符串。例如 `123`、`true`、`null`、`[1,2]`、`{"a":1}` 都会还原成对应的 number / boolean / null / array / object。

## 4) 输出结构

`ParseToolCallsDetailed` / `parseToolCallsDetailed` 返回：

- `calls`：解析出的工具调用列表（`name` + `input`）
- `sawToolCallSyntax`：检测到 DSML / canonical wrapper，或命中“缺失 opening wrapper 但可修复”的形态时会为 `true`；裸 `invoke` 不计入该标记
- `rejectedByPolicy`：当前固定为 `false`
- `rejectedToolNames`：当前固定为空数组

## 5) 落地建议

1. Prompt 里只示范 DSML 外壳语法。
2. 上游客户端应直接输出完整 DSML 外壳；DS2API 兼容旧式 canonical XML，并只对“closing tag 在、opening tag 漏掉”的常见失误做窄修复，不会泛化接受其他旧格式。
3. 不要依赖 parser 做安全控制；执行器侧仍应做工具名和参数校验。

## 6) 回归验证

可直接运行：

```bash
go test -v -run 'TestParseToolCalls|TestProcessToolSieve' ./internal/toolcall ./internal/toolstream ./internal/httpapi/openai/...
node --test tests/node/stream-tool-sieve.test.js
```

重点覆盖：

- DSML `<|DSML|tool_calls>` wrapper 正常解析
- legacy canonical `<tool_calls>` wrapper 正常解析
- 别名变体（`<dsml|tool_calls>`、`<｜tool_calls>`、`<|tool_calls>`）、DSML 空格分隔 typo（如 `<|DSML tool_calls>`）和黏连 typo（如 `<DSMLtool_calls>`）正常解析
- 混搭标签（DSML wrapper + canonical inner）归一化后正常解析
- 波浪线围栏 `~~~` 内的示例不执行
- 嵌套围栏（4 反引号嵌套 3 反引号）内的示例不执行
- 文本 mention 标签名后紧跟真正工具调用的场景（含同一 wrapper 变体）
- 非兼容内容按普通文本透传
- 代码块示例不执行
