# 原始流数据样本目录

该目录只保留**上游真实 SSE 原始流**，用于本地回放、字段分析和回归测试。

## 默认永久样本

仓库当前保留两份 canonical 默认样本：

- `guangzhou-weather-reasoner-search-20260404`：包含 `reference:N` 引用标记的天气搜索流，用于验证引用清理与正文输出。
- `content-filter-trigger-20260405-jwt3`：真实命中的 `CONTENT_FILTER` 风控流，用于验证终态处理与拒答格式。

默认回放工具会优先读取 [`manifest.json`](./manifest.json) 中的 `default_samples`，以稳定固定回放集。

## 自动采集接口

本地启动服务后，可以直接调用专用接口自动落盘一份 raw-only 样本：

```bash
POST /admin/dev/raw-samples/capture
```

这个接口会：

- 接收一个普通的 OpenAI chat completions 请求体
- 走项目内同一条处理链
- 自动保存请求元信息 `meta.json`
- 自动保存上游原始流 `upstream.stream.sse`

采集接口的响应体仍然是项目当次的实际输出，但它不会再写入样本目录。这样样本树始终只保留原始流，后续回放时再按需本地生成派生结果。

## 目录规范

每个样本一个子目录，且只保留下面两类文件：

- `meta.json`：样本元信息（问题、模型、采集时间、备注）
- `upstream.stream.sse`：完整原始 SSE 文本（`event:` / `data:` 行）

## 回放与对比

回放工具会读取 `upstream.stream.sse`，在本地自动生成当前解析结果，并把派生结果写到 `artifacts/raw-stream-sim/<run-id>/<sample-id>/`，例如：

- `replay.output.txt`：本次回放生成的最终可见文本
- `report.json`：本次回放的结构化报告，包含事件数、chunk 数、终态、引用泄露检查等信息

运行全部 canonical 样本：

```bash
./tests/scripts/run-raw-stream-sim.sh
```

运行单个样本并和已有基线比对：

```bash
./tests/scripts/compare-raw-stream-sample.sh markdown-format-example-20260405-spacefix
```

如果你已经有历史基线目录，也可以把它作为第二个参数传进去，脚本会对比当前回放结果和基线输出。

## 扩展方式

1. 抓取一次真实请求。
2. 直接调用 `/admin/dev/raw-samples/capture`，或者手工新建 `<sample-id>/` 目录并放入 `meta.json` + `upstream.stream.sse`。
3. 运行回放工具或对比脚本，生成本地派生结果并检查是否回归。

> 注意：样本可能包含搜索结果正文与引用信息，请勿放入敏感账号/密钥。
