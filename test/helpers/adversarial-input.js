'use strict';
// Hostile and odd route files for the adversarial test (invented; payloads must come out as plain escaped text).
const PAY = ['x|y', '&lt;b&gt;y&lt;/b&gt;', '[link](https://evil.test)', '&lt;img src=https://evil.test/i.png&gt;', '*b*', '_i_', '$x$', 'www.evil.test', '`code`'];
const cases = [];
PAY.forEach((p, i) => {
  cases.push({ name: 'xml ' + i, text: '<routes><route id="' + p + '"><from uri="direct:' + p + '"/><to uri="http://' + p + '?password=' + p + '"/><to uri="' + p + '"/></route></routes>' });
  const y = p.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  cases.push({ name: 'yaml ' + i, text: '- route:\n    id: "' + y + '"\n    from:\n      uri: "direct:' + y + '"\n      steps:\n        - to: "http://' + y + '?token=' + y + '"\n' });
});
cases.push({ name: 'prototype names', text: '<routes><route id="__proto__"><from uri="direct:constructor"/><to uri="direct:toString"/></route><route id="__proto__"><from uri="__proto__:x"/></route></routes>' });
cases.push({ name: 'unclosed tags', text: '<routes><route id="a"><from uri="direct:a"<to uri="x"/>' + '<route>'.repeat(20000) });
cases.push({ name: 'huge attribute', text: '<routes><route id="big"><from uri="direct:' + 'a'.repeat(300000) + '"/></route></routes>' });
cases.push({ name: 'deep yaml', text: '- route:\n' + Array.from({ length: 5000 }, (_, i) => ' '.repeat(i + 4) + 'k' + i + ':').join('\n') + '\n' });
module.exports = { cases };
