'use strict';
// Builds an XML route file of about `bytes` characters for the large-file test (invented routes).
function make(bytes) {
  const parts = ['<?xml version="1.0"?>\n<routes xmlns="http://camel.apache.org/schema/spring">\n']; let size = parts[0].length, i = 0;
  while (size < bytes) {
    const s = '  <route id="route-' + i + '">\n    <from uri="direct:r' + i + '"/>\n    <log message="' + 'x'.repeat(60) + '"/>\n    <to uri="direct:r' + (i + 1) + '"/>\n    <to uri="https://api.example.test/v1/items?apiKey={{api.key}}"/>\n  </route>\n';
    parts.push(s); size += s.length; i++;
  }
  parts.push('</routes>\n');
  return parts.join('');
}
module.exports = { make };
