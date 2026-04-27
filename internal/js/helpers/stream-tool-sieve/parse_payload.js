'use strict';

const TOOL_CALL_MARKUP_KV_PATTERN = /<(?:[a-z0-9_:-]+:)?([a-z0-9_.-]+)\b[^>]*>([\s\S]*?)<\/(?:[a-z0-9_:-]+:)?\1>/gi;
const CDATA_PATTERN = /^<!\[CDATA\[([\s\S]*?)]]>$/i;
const XML_ATTR_PATTERN = /\b([a-z0-9_:-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi;
const TOOL_MARKUP_NAMES = ['tool_calls', 'invoke', 'parameter'];

const {
  toStringSafe,
} = require('./state');

function stripFencedCodeBlocks(text) {
  const t = typeof text === 'string' ? text : '';
  if (!t) {
    return '';
  }
  const lines = t.split('\n');
  const out = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let inCDATA = false;
  let beforeFenceIdx = 0;

  for (let li = 0; li < lines.length; li += 1) {
    const line = lines[li];
    const lineWithNL = li < lines.length - 1 ? line + '\n' : line;

    // CDATA protection
    if (inCDATA || cdataStartsBeforeFence(line)) {
      out.push(lineWithNL);
      inCDATA = updateCDATAStateLine(inCDATA, line);
      continue;
    }

    const trimmed = line.replace(/^[ \t]+/, '');
    if (!inFence) {
      const fence = parseFenceOpenLine(trimmed);
      if (fence) {
        inFence = true;
        fenceChar = fence.ch;
        fenceLen = fence.count;
        beforeFenceIdx = out.length;
        continue;
      }
      out.push(lineWithNL);
      continue;
    }

    if (isFenceCloseLine(trimmed, fenceChar, fenceLen)) {
      inFence = false;
      fenceChar = '';
      fenceLen = 0;
    }
  }

  if (inFence) {
    // Unclosed fence: keep content before the fence started.
    if (beforeFenceIdx > 0) {
      return out.slice(0, beforeFenceIdx).join('');
    }
    return '';
  }
  return out.join('');
}

function parseFenceOpenLine(trimmed) {
  if (trimmed.length < 3) return null;
  const ch = trimmed[0];
  if (ch !== '`' && ch !== '~') return null;
  let count = 0;
  while (count < trimmed.length && trimmed[count] === ch) count++;
  if (count < 3) return null;
  return { ch, count };
}

function isFenceCloseLine(trimmed, fenceChar, fenceLen) {
  if (!fenceChar || !trimmed || trimmed[0] !== fenceChar) return false;
  let count = 0;
  while (count < trimmed.length && trimmed[count] === fenceChar) count++;
  if (count < fenceLen) return false;
  return trimmed.slice(count).trim() === '';
}

function cdataStartsBeforeFence(line) {
  const cdataIdx = line.toLowerCase().indexOf('<![cdata[');
  if (cdataIdx < 0) return false;
  const fenceIdx = Math.min(
    line.indexOf('```') >= 0 ? line.indexOf('```') : Infinity,
    line.indexOf('~~~') >= 0 ? line.indexOf('~~~') : Infinity,
  );
  return fenceIdx === Infinity || cdataIdx < fenceIdx;
}

function updateCDATAStateLine(inCDATA, line) {
  const lower = line.toLowerCase();
  let pos = 0;
  let state = inCDATA;
  while (pos < lower.length) {
    if (state) {
      const end = lower.indexOf(']]>', pos);
      if (end < 0) return true;
      pos = end + ']]>'.length;
      state = false;
      continue;
    }
    const start = lower.indexOf('<![cdata[', pos);
    if (start < 0) return false;
    pos = start + '<![cdata['.length;
    state = true;
  }
  return state;
}

function parseMarkupToolCalls(text) {
  const normalized = normalizeDSMLToolCallMarkup(toStringSafe(text));
  if (!normalized.ok) {
    return [];
  }
  const raw = normalized.text.trim();
  if (!raw) {
    return [];
  }
  const out = [];
  for (const wrapper of findXmlElementBlocks(raw, 'tool_calls')) {
    const body = toStringSafe(wrapper.body);
    for (const block of findXmlElementBlocks(body, 'invoke')) {
      const parsed = parseMarkupSingleToolCall(block);
      if (parsed) {
        out.push(parsed);
      }
    }
  }
  return out;
}

function normalizeDSMLToolCallMarkup(text) {
  const raw = toStringSafe(text);
  if (!raw) {
    return { text: '', ok: true };
  }
  const styles = containsToolMarkupSyntaxOutsideIgnored(raw);
  if (!styles.dsml) {
    return { text: raw, ok: true };
  }
  return {
    text: replaceDSMLToolMarkupOutsideIgnored(raw),
    ok: true,
  };
}

function containsDSMLToolMarkup(text) {
  return containsToolMarkupSyntaxOutsideIgnored(text).dsml;
}

function containsCanonicalToolMarkup(text) {
  return containsToolMarkupSyntaxOutsideIgnored(text).canonical;
}

function containsToolCallWrapperSyntaxOutsideIgnored(text) {
  const raw = toStringSafe(text);
  const styles = { dsml: false, canonical: false };
  if (!raw) {
    return styles;
  }
  const lower = raw.toLowerCase();
  for (let i = 0; i < raw.length;) {
    const skipped = skipXmlIgnoredSection(lower, i);
    if (skipped.blocked) {
      return styles;
    }
    if (skipped.advanced) {
      i = skipped.next;
      continue;
    }
    const tag = scanToolMarkupTagAt(raw, i);
    if (tag) {
      if (tag.name !== 'tool_calls') {
        i = tag.end + 1;
        continue;
      }
      if (tag.dsmlLike) {
        styles.dsml = true;
      } else {
        styles.canonical = true;
      }
      if (styles.dsml && styles.canonical) {
        return styles;
      }
      i = tag.end + 1;
      continue;
    }
    i += 1;
  }
  return styles;
}
function containsToolMarkupSyntaxOutsideIgnored(text) {
  const raw = toStringSafe(text);
  const styles = { dsml: false, canonical: false };
  if (!raw) {
    return styles;
  }
  for (let i = 0; i < raw.length;) {
    const skipped = skipXmlIgnoredSection(raw.toLowerCase(), i);
    if (skipped.blocked) {
      return styles;
    }
    if (skipped.advanced) {
      i = skipped.next;
      continue;
    }
    const tag = scanToolMarkupTagAt(raw, i);
    if (tag) {
      if (tag.dsmlLike) {
        styles.dsml = true;
      } else {
        styles.canonical = true;
      }
      if (styles.dsml && styles.canonical) {
        return styles;
      }
      i = tag.end + 1;
      continue;
    }
    i += 1;
  }
  return styles;
}

function replaceDSMLToolMarkupOutsideIgnored(text) {
  const raw = toStringSafe(text);
  if (!raw) {
    return '';
  }
  const lower = raw.toLowerCase();
  let out = '';
  for (let i = 0; i < raw.length;) {
    const skipped = skipXmlIgnoredSection(lower, i);
    if (skipped.blocked) {
      out += raw.slice(i);
      break;
    }
    if (skipped.advanced) {
      out += raw.slice(i, skipped.next);
      i = skipped.next;
      continue;
    }
    const tag = scanToolMarkupTagAt(raw, i);
    if (tag) {
      if (tag.dsmlLike) {
        out += `<${tag.closing ? '/' : ''}${tag.name}${raw.slice(tag.nameEnd, tag.end + 1)}`;
      } else {
        out += raw.slice(tag.start, tag.end + 1);
      }
      i = tag.end + 1;
      continue;
    }
    out += raw[i];
    i += 1;
  }
  return out;
}

function parseMarkupSingleToolCall(block) {
  const attrs = parseTagAttributes(block.attrs);
  const name = toStringSafe(attrs.name).trim();
  if (!name) {
    return null;
  }
  const inner = toStringSafe(block.body).trim();

  if (inner) {
    try {
      const decoded = JSON.parse(inner);
      if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
        return {
          name,
          input: decoded.input && typeof decoded.input === 'object' && !Array.isArray(decoded.input)
            ? decoded.input
            : decoded.parameters && typeof decoded.parameters === 'object' && !Array.isArray(decoded.parameters)
              ? decoded.parameters
              : {},
        };
      }
    } catch (_err) {
      // Not JSON, continue with markup parsing.
    }
  }
  const input = {};
  for (const match of findXmlElementBlocks(inner, 'parameter')) {
    const parameterAttrs = parseTagAttributes(match.attrs);
    const paramName = toStringSafe(parameterAttrs.name).trim();
    if (!paramName) {
      continue;
    }
    appendMarkupValue(input, paramName, parseMarkupValue(match.body));
  }
  if (Object.keys(input).length === 0 && inner.trim() !== '') {
    return null;
  }
  return { name, input };
}

function findXmlElementBlocks(text, tag) {
  const source = toStringSafe(text);
  const name = toStringSafe(tag).toLowerCase();
  if (!source || !name) {
    return [];
  }
  const out = [];
  let pos = 0;
  while (pos < source.length) {
    const start = findXmlStartTagOutsideCDATA(source, name, pos);
    if (!start) {
      break;
    }
    const end = findMatchingXmlEndTagOutsideCDATA(source, name, start.bodyStart);
    if (!end) {
      pos = start.bodyStart;
      continue;
    }
    out.push({
      attrs: start.attrs,
      body: source.slice(start.bodyStart, end.closeStart),
      start: start.start,
      end: end.closeEnd,
    });
    pos = end.closeEnd;
  }
  return out;
}

function findXmlStartTagOutsideCDATA(text, tag, from) {
  const lower = text.toLowerCase();
  const target = `<${tag}`;
  for (let i = Math.max(0, from || 0); i < text.length;) {
    const skipped = skipXmlIgnoredSection(lower, i);
    if (skipped.blocked) {
      return null;
    }
    if (skipped.advanced) {
      i = skipped.next;
      continue;
    }
    if (lower.startsWith(target, i) && hasXmlTagBoundary(text, i + target.length)) {
      const tagEnd = findXmlTagEnd(text, i + target.length);
      if (tagEnd < 0) {
        return null;
      }
      return {
        start: i,
        bodyStart: tagEnd + 1,
        attrs: text.slice(i + target.length, tagEnd),
      };
    }
    i += 1;
  }
  return null;
}

function findMatchingXmlEndTagOutsideCDATA(text, tag, from) {
  const lower = text.toLowerCase();
  const openTarget = `<${tag}`;
  const closeTarget = `</${tag}`;
  let depth = 1;
  for (let i = Math.max(0, from || 0); i < text.length;) {
    const skipped = skipXmlIgnoredSection(lower, i);
    if (skipped.blocked) {
      return null;
    }
    if (skipped.advanced) {
      i = skipped.next;
      continue;
    }
    if (lower.startsWith(closeTarget, i) && hasXmlTagBoundary(text, i + closeTarget.length)) {
      const tagEnd = findXmlTagEnd(text, i + closeTarget.length);
      if (tagEnd < 0) {
        return null;
      }
      depth -= 1;
      if (depth === 0) {
        return { closeStart: i, closeEnd: tagEnd + 1 };
      }
      i = tagEnd + 1;
      continue;
    }
    if (lower.startsWith(openTarget, i) && hasXmlTagBoundary(text, i + openTarget.length)) {
      const tagEnd = findXmlTagEnd(text, i + openTarget.length);
      if (tagEnd < 0) {
        return null;
      }
      if (!isSelfClosingXmlTag(text.slice(i, tagEnd))) {
        depth += 1;
      }
      i = tagEnd + 1;
      continue;
    }
    i += 1;
  }
  return null;
}

function skipXmlIgnoredSection(lower, i) {
  if (lower.startsWith('<![cdata[', i)) {
    const end = lower.indexOf(']]>', i + '<![cdata['.length);
    if (end < 0) {
      return { advanced: false, blocked: true, next: i };
    }
    return { advanced: true, blocked: false, next: end + ']]>'.length };
  }
  if (lower.startsWith('<!--', i)) {
    const end = lower.indexOf('-->', i + '<!--'.length);
    if (end < 0) {
      return { advanced: false, blocked: true, next: i };
    }
    return { advanced: true, blocked: false, next: end + '-->'.length };
  }
  return { advanced: false, blocked: false, next: i };
}

function scanToolMarkupTagAt(text, start) {
  const raw = toStringSafe(text);
  if (!raw || start < 0 || start >= raw.length || raw[start] !== '<') {
    return null;
  }
  const lower = raw.toLowerCase();
  let i = start + 1;
  const closing = raw[i] === '/';
  if (closing) {
    i += 1;
  }
  let dsmlLike = false;
  if (i < raw.length && isToolMarkupPipe(raw[i])) {
    dsmlLike = true;
    i += 1;
  }
  if (lower.startsWith('dsml', i)) {
    dsmlLike = true;
    i += 'dsml'.length;
    while (i < raw.length && isToolMarkupSeparator(raw[i])) {
      i += 1;
    }
  }
  const { name, len } = matchToolMarkupName(lower, i);
  if (!name) {
    return null;
  }
  const nameEnd = i + len;
  if (!hasXmlTagBoundary(raw, nameEnd)) {
    return null;
  }
  const end = findXmlTagEnd(raw, nameEnd);
  if (end < 0) {
    return null;
  }
  return {
    start,
    end,
    nameStart: i,
    nameEnd,
    name,
    closing,
    selfClosing: raw.slice(start, end + 1).trim().endsWith('/>'),
    dsmlLike,
    canonical: !dsmlLike,
  };
}

function findToolMarkupTagOutsideIgnored(text, from) {
  const raw = toStringSafe(text);
  const lower = raw.toLowerCase();
  for (let i = Math.max(0, from || 0); i < raw.length;) {
    const skipped = skipXmlIgnoredSection(lower, i);
    if (skipped.blocked) {
      return null;
    }
    if (skipped.advanced) {
      i = skipped.next;
      continue;
    }
    const tag = scanToolMarkupTagAt(raw, i);
    if (tag) {
      return tag;
    }
    i += 1;
  }
  return null;
}

function findMatchingToolMarkupClose(text, openTag) {
  const raw = toStringSafe(text);
  if (!raw || !openTag || !openTag.name || openTag.closing) {
    return null;
  }
  let depth = 1;
  for (let pos = openTag.end + 1; pos < raw.length;) {
    const tag = findToolMarkupTagOutsideIgnored(raw, pos);
    if (!tag) {
      return null;
    }
    if (tag.name !== openTag.name) {
      pos = tag.end + 1;
      continue;
    }
    if (tag.closing) {
      depth -= 1;
      if (depth === 0) {
        return tag;
      }
    } else if (!tag.selfClosing) {
      depth += 1;
    }
    pos = tag.end + 1;
  }
  return null;
}

function findPartialToolMarkupStart(text) {
  const raw = toStringSafe(text);
  const lastLT = raw.lastIndexOf('<');
  if (lastLT < 0) {
    return -1;
  }
  const tail = raw.slice(lastLT);
  if (tail.includes('>')) {
    return -1;
  }
  const lowerTail = tail.toLowerCase();
  const candidates = [
    '<tool_calls', '<invoke', '<parameter',
    '<|tool_calls', '<|invoke', '<|parameter',
    '<｜tool_calls', '<｜invoke', '<｜parameter',
    '<|dsml|tool_calls', '<|dsml|invoke', '<|dsml|parameter',
    '<dsmltool_calls', '<dsmlinvoke', '<dsmlparameter',
    '<dsml tool_calls', '<dsml invoke', '<dsml parameter',
    '<dsml|tool_calls', '<dsml|invoke', '<dsml|parameter',
    '<|dsmltool_calls', '<|dsmlinvoke', '<|dsmlparameter',
    '<|dsml tool_calls', '<|dsml invoke', '<|dsml parameter',
  ];
  for (const candidate of candidates) {
    if (candidate.startsWith(lowerTail)) {
      return lastLT;
    }
  }
  return -1;
}

function isToolMarkupPipe(ch) {
  return ch === '|' || ch === '｜';
}

function isToolMarkupSeparator(ch) {
  return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || isToolMarkupPipe(ch);
}

function matchToolMarkupName(lower, start) {
  for (const name of TOOL_MARKUP_NAMES) {
    if (lower.startsWith(name, start)) {
      return { name, len: name.length };
    }
  }
  return { name: '', len: 0 };
}

function findXmlTagEnd(text, from) {
  let quote = '';
  for (let i = Math.max(0, from || 0); i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) {
        quote = '';
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') {
      return i;
    }
  }
  return -1;
}

function hasXmlTagBoundary(text, idx) {
  if (idx >= text.length) {
    return true;
  }
  return [' ', '\t', '\n', '\r', '>', '/'].includes(text[idx]);
}

function isSelfClosingXmlTag(startTag) {
  return toStringSafe(startTag).trim().endsWith('/');
}

function parseMarkupInput(raw) {
  const s = toStringSafe(raw).trim();
  if (!s) {
    return {};
  }
  // Prioritize XML-style KV tags (e.g., <arg>val</arg>)
  const kv = parseMarkupKVObject(s);
  if (Object.keys(kv).length > 0) {
    return kv;
  }

  // Fallback to JSON parsing
  const parsed = parseToolCallInput(s);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  return { _raw: extractRawTagValue(s) };
}

function parseMarkupKVObject(text) {
  const raw = toStringSafe(text).trim();
  if (!raw) {
    return {};
  }
  const out = {};
  for (const m of raw.matchAll(TOOL_CALL_MARKUP_KV_PATTERN)) {
    const key = toStringSafe(m[1]).trim();
    if (!key) {
      continue;
    }
    const value = parseMarkupValue(m[2]);
    if (value === undefined || value === null) {
      continue;
    }
    appendMarkupValue(out, key, value);
  }
  return out;
}

function parseMarkupValue(raw) {
  const cdata = extractStandaloneCDATA(raw);
  if (cdata.ok) {
    const literal = parseJSONLiteralValue(cdata.value);
    return literal.ok ? literal.value : cdata.value;
  }
  const s = toStringSafe(extractRawTagValue(raw)).trim();
  if (!s) {
    return '';
  }

  if (s.includes('<') && s.includes('>')) {
    const nested = parseMarkupInput(s);
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      if (isOnlyRawValue(nested)) {
        return toStringSafe(nested._raw);
      }
      return nested;
    }
  }

  const literal = parseJSONLiteralValue(s);
  if (literal.ok) {
    return literal.value;
  }
  return s;
}

function extractRawTagValue(inner) {
  const s = toStringSafe(inner).trim();
  if (!s) {
    return '';
  }

  // 1. Check for CDATA
  const cdata = extractStandaloneCDATA(s);
  if (cdata.ok) {
    return cdata.value;
  }

  // 2. Fallback to unescaping standard HTML entities
  // Note: we avoid broad tag stripping here to preserve user content (like < symbols in code)
  return unescapeHtml(inner);
}

function unescapeHtml(safe) {
  if (!safe) return '';
  return safe.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function extractStandaloneCDATA(inner) {
  const s = toStringSafe(inner).trim();
  const cdataMatch = s.match(CDATA_PATTERN);
  if (cdataMatch && cdataMatch[1] !== undefined) {
    return { ok: true, value: cdataMatch[1] };
  }
  if (s.toLowerCase().startsWith('<![cdata[')) {
    return { ok: true, value: s.slice('<![CDATA['.length) };
  }
  return { ok: false, value: '' };
}

function parseJSONLiteralValue(raw) {
  const s = toStringSafe(raw).trim();
  if (!s) {
    return { ok: false, value: null };
  }
  if (!['{', '[', '"', '-', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 't', 'f', 'n'].includes(s[0])) {
    return { ok: false, value: null };
  }
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch (_err) {
    return { ok: false, value: null };
  }
}

function sanitizeLooseCDATA(text) {
  const raw = toStringSafe(text);
  if (!raw) {
    return '';
  }
  const lower = raw.toLowerCase();
  const openMarker = '<![cdata[';
  const closeMarker = ']]>';

  let out = '';
  let pos = 0;
  let changed = false;
  while (pos < raw.length) {
    const startRel = lower.indexOf(openMarker, pos);
    if (startRel < 0) {
      out += raw.slice(pos);
      break;
    }
    const start = startRel;
    const contentStart = start + openMarker.length;
    out += raw.slice(pos, start);

    const endRel = lower.indexOf(closeMarker, contentStart);
    if (endRel >= 0) {
      const end = endRel + closeMarker.length;
      out += raw.slice(start, end);
      pos = end;
      continue;
    }

    changed = true;
    out += raw.slice(contentStart);
    pos = raw.length;
  }

  return changed ? out : raw;
}

function parseTagAttributes(raw) {
  const source = toStringSafe(raw);
  const out = {};
  if (!source) {
    return out;
  }
  for (const match of source.matchAll(XML_ATTR_PATTERN)) {
    const key = toStringSafe(match[1]).trim().toLowerCase();
    if (!key) {
      continue;
    }
    out[key] = match[3] || match[4] || '';
  }
  return out;
}

function parseToolCallInput(v) {
  if (v == null) {
    return {};
  }
  if (typeof v === 'string') {
    const raw = toStringSafe(v);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return { _raw: raw };
    } catch (_err) {
      return { _raw: raw };
    }
  }
  if (typeof v === 'object' && !Array.isArray(v)) {
    return v;
  }
  try {
    const parsed = JSON.parse(JSON.stringify(v));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_err) {
    return {};
  }
  return {};
}

function appendMarkupValue(out, key, value) {
  if (Object.prototype.hasOwnProperty.call(out, key)) {
    const current = out[key];
    if (Array.isArray(current)) {
      current.push(value);
      return;
    }
    out[key] = [current, value];
    return;
  }
  out[key] = value;
}

function isOnlyRawValue(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  const keys = Object.keys(obj);
  return keys.length === 1 && keys[0] === '_raw';
}

module.exports = {
  stripFencedCodeBlocks,
  parseMarkupToolCalls,
  normalizeDSMLToolCallMarkup,
  containsToolMarkupSyntaxOutsideIgnored,
  containsToolCallWrapperSyntaxOutsideIgnored,
  findToolMarkupTagOutsideIgnored,
  findMatchingToolMarkupClose,
  findPartialToolMarkupStart,
  sanitizeLooseCDATA,
};
