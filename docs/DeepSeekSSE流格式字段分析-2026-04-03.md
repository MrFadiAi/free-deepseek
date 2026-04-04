# DeepSeek SSE 流格式字段分析（永久默认样本）

> 日期：2026-04-05（UTC）
> 
> 默认样本：
> - `tests/raw_stream_samples/guangzhou-weather-reasoner-search-20260404/upstream.stream.sse`
> - `tests/raw_stream_samples/content-filter-trigger-20260405-jwt3/upstream.stream.sse`
> 
> 模型：`deepseek-reasoner-search`（搜索 + 思考）

## 1. SSE 事件层结构

原始流由标准 SSE 帧组成，常见形态：

```text
event: <type>
data: <json or text>

```

样本中主要 `event` 类型：

- `ready`：流建立后返回请求/响应消息 ID。
- `update_session`：会话时间戳更新。
- `finish`：流式阶段结束。
- （无 `event` 时）默认为 message 事件，`data:` 中承载主要增量数据。

## 2. `data` JSON 常见字段

上游增量主体多为 JSON Patch 风格对象：

- `p`（path）：字段路径，如 `response/fragments/-1/content`。
- `o`（op，可选）：操作类型，常见 `SET` / `APPEND` / `BATCH`。
- `v`（value）：值（字符串、布尔、对象、数组都可能）。

示例（语义）：

- `{"p":"response/fragments/-1/content","o":"APPEND","v":"..."}`
- `{"p":"response/fragments/-16/status","v":"FINISHED"}`
- `{"p":"response/status","o":"SET","v":"FINISHED"}`

## 3. 搜索+思考场景关键路径

### 3.1 文本内容

- `response/fragments/<idx>/content`
- `response/content`
- `response/thinking_content`
- `response/fragments`（`APPEND` + fragment 数组）

### 3.2 搜索相关

- `response/fragments/<idx>/results`（检索结果数组）
- `response/search_status`（检索状态，建议跳过展示）

### 3.3 状态相关（重点）

- `response/status = FINISHED`：**最终结束信号**（需要保留用于结束判定）
- `response/fragments/<idx>/status = FINISHED`：**分片级状态**（高频，建议跳过输出）
- `response/quasi_status`：过程状态（建议跳过输出）

## 4. 泄露问题根因（FINISHED 重复）

在搜索 + 思考模型中，`response/fragments/<idx>/status` 会出现大量不同 `<idx>`（例如 `-1/-2/-3/-16...`）的 `FINISHED`。

若只过滤固定少量索引（例如仅 `-1/-2/-3`），其他索引的状态会当普通文本透传，导致前端出现：

- `FINISHEDFINISHEDFINISHED...`

## 5. 适配建议（已落地）

1. 跳过所有 `response/fragments/-?\d+/status`。
2. 继续保留 `response/status=FINISHED` 作为真正结束判定。
3. 通过独立仿真工具持续回放 manifest 声明的 canonical 默认样本，作为回归门禁：

```bash
./tests/scripts/run-raw-stream-sim.sh
```

如果需要新增永久样本，可以直接走本地专用接口：

```bash
POST /admin/dev/raw-samples/capture
```

它只会把请求元信息和原始上游流落到 `tests/raw_stream_samples/<sample-id>/`。项目最终输出不会再写入样本目录，而是留给本地回放工具按需生成，写到 `artifacts/raw-stream-sim/<run-id>/<sample-id>/` 里做对照和查阅。

## 6. `CONTENT_FILTER` 终态样本

在 `content-filter-trigger-20260405-jwt3` 样本中，末尾会出现一组明确的风控终态字段：

- `response.status = CONTENT_FILTER`
- `response.quasi_status = CONTENT_FILTER`
- `response.fragments` 里包含 `TEMPLATE_RESPONSE` 拒答文案
- 后续仍会有 `event: finish`

这说明：

1. 风控不是“没有结束信号”，而是“正常流式输出后在尾部切换到风控终态”。
2. 适配层不能把 `TEMPLATE_RESPONSE` 当普通正文输出。
3. 回放工具需要把这种终态保留下来，用于后续回归和字段分析。

## 7. 后续扩展建议

- 增加不同模型（`deepseek-chat-search` / 非 search / 非 thinking）样本。
- 增加异常样本（限流、中断、content_filter、空结果）。
- 为仿真报告加入字段覆盖率统计（路径频次、事件频次、终止路径命中率）。
