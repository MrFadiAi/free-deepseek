'use strict';

const XML_TOOL_SEGMENT_TAGS = [
  '<|dsml|tool_calls>', '<|dsml|tool_calls\n', '<|dsml|tool_calls ',
  '<|dsml|invoke ', '<|dsml|invoke\n', '<|dsml|invoke\t', '<|dsml|invoke\r',
  '<|dsmltool_calls>', '<|dsmltool_calls\n', '<|dsmltool_calls ',
  '<|dsmlinvoke ', '<|dsmlinvoke\n', '<|dsmlinvoke\t', '<|dsmlinvoke\r',
  '<|dsml tool_calls>', '<|dsml tool_calls\n', '<|dsml tool_calls ',
  '<|dsml invoke ', '<|dsml invoke\n', '<|dsml invoke\t', '<|dsml invoke\r',
  '<dsml|tool_calls>', '<dsml|tool_calls\n', '<dsml|tool_calls ',
  '<dsml|invoke ', '<dsml|invoke\n', '<dsml|invoke\t', '<dsml|invoke\r',
  '<dsmltool_calls>', '<dsmltool_calls\n', '<dsmltool_calls ',
  '<dsmlinvoke ', '<dsmlinvoke\n', '<dsmlinvoke\t', '<dsmlinvoke\r',
  '<dsml tool_calls>', '<dsml tool_calls\n', '<dsml tool_calls ',
  '<dsml invoke ', '<dsml invoke\n', '<dsml invoke\t', '<dsml invoke\r',
  '<｜tool_calls>', '<｜tool_calls\n', '<｜tool_calls ',
  '<｜invoke ', '<｜invoke\n', '<｜invoke\t', '<｜invoke\r',
  '<|tool_calls>', '<|tool_calls\n', '<|tool_calls ',
  '<|invoke ', '<|invoke\n', '<|invoke\t', '<|invoke\r',
  '<tool_calls>', '<tool_calls\n', '<tool_calls ',
  '<invoke ', '<invoke\n', '<invoke\t', '<invoke\r',
];

const XML_TOOL_OPENING_TAGS = [
  '<|dsml|tool_calls',
  '<|dsmltool_calls',
  '<|dsml tool_calls',
  '<dsml|tool_calls',
  '<dsmltool_calls',
  '<dsml tool_calls',
  '<｜tool_calls',
  '<|tool_calls',
  '<tool_calls',
];

const XML_TOOL_CLOSING_TAGS = [
  '</|dsml|tool_calls>',
  '</|dsmltool_calls>',
  '</|dsml tool_calls>',
  '</dsml|tool_calls>',
  '</dsmltool_calls>',
  '</dsml tool_calls>',
  '</｜tool_calls>',
  '</|tool_calls>',
  '</tool_calls>',
];

module.exports = {
  XML_TOOL_SEGMENT_TAGS,
  XML_TOOL_OPENING_TAGS,
  XML_TOOL_CLOSING_TAGS,
};
