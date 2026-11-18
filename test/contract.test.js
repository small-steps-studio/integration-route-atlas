'use strict';
// Contract tests: written from the specification examples. Do not edit; fix src/core.js instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core');

const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

test('core exports every specified function', () => {
  for (const n of ["componentOf", "routeIds", "reportSummary", "reportEndpoints", "reportRouteCheck", "reportErrorHandling", "reportSecurity"]) assert.equal(typeof core[n], 'function', n);
});

test("componentOf example 1", () => {
  assert.deepStrictEqual(plain(core.componentOf("direct:validate")), "direct");
});

test("componentOf example 2", () => {
  assert.deepStrictEqual(plain(core.componentOf("Kafka:topic?brokers=x")), "kafka");
});

test("componentOf example 3", () => {
  assert.deepStrictEqual(plain(core.componentOf("http://example.test/a")), "http");
});

test("componentOf example 4", () => {
  assert.deepStrictEqual(plain(core.componentOf("no component")), "");
});

test("componentOf example 5", () => {
  assert.deepStrictEqual(plain(core.componentOf(null)), "");
});

test("routeIds example 1", () => {
  assert.deepStrictEqual(plain(core.routeIds("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n")), ["orders-in", "validate", "", "validate"]);
});

test("routeIds example 2", () => {
  assert.deepStrictEqual(plain(core.routeIds("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n")), ["ticker", "", ""]);
});

test("routeIds example 3", () => {
  assert.deepStrictEqual(plain(core.routeIds("nothing")), []);
});

test("reportSummary example 1", () => {
  const md = core.reportSummary("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n");
  assert.equal(typeof md, 'string');
  for (const s of ["XML routes: 4 routes, 11 endpoints, 9 components.", "| direct | 3 |", "| exec | 1 |", "| file | 1 |", "| ftp | 1 |", "| http | 1 |", "| seda | 1 |", "| sftp | 1 |", "| sql | 1 |", "| timer | 1 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSummary example 2", () => {
  const md = core.reportSummary("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n");
  assert.equal(typeof md, 'string');
  for (const s of ["YAML routes: 3 routes, 8 endpoints, 6 components."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSummary example 3", () => {
  const md = core.reportSummary("hello");
  assert.equal(typeof md, 'string');
  for (const s of ["# Route Summary", "This file contains no Camel routes (XML with <route> or YAML with - route: or - from:)."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportEndpoints example 1", () => {
  const md = core.reportEndpoints("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n");
  assert.equal(typeof md, 'string');
  for (const s of ["| 9 | orders-in | from | file | file:inbox/orders?move=.done |", "| 11 | orders-in | to | direct | direct:validate |", "| 12 | orders-in | wireTap | seda | seda:audit |", "| 15 | validate | from | direct | direct:validate |", "| 16 | validate | to | http | http\\:\\/\\/partner.example.test/api/orders?authUsername=shop\\&authPassword=s3cret |", "| 17 | validate | toD | sql | sql:insert into orders values \\(:\\#\\$\\{body\\}\\) |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportEndpoints example 2", () => {
  const md = core.reportEndpoints("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n");
  assert.equal(typeof md, 'string');
  for (const s of ["| 5 | ticker | from | timer | timer:tick?period=5000 |", "| 10 | ticker | to | seda | seda:greetings |", "| 11 | ticker | to | log | log:info |", "| 14 | \\(route 2\\) | from | seda | seda:greetings |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportRouteCheck example 1", () => {
  const md = core.reportRouteCheck("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n");
  assert.equal(typeof md, 'string');
  for (const s of ["4 problems found.", "| 12 | orders-in | wireTap seda:audit: no route in this file consumes from it |", "| 18 | validate | to direct:notify: no route in this file consumes from it |", "| 20 | \\(route 3\\) | the route has no id; give it one so logs, metrics and tracing name it |", "| 24 | validate | route id validate is also used on line 14 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportRouteCheck example 2", () => {
  const md = core.reportRouteCheck("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n");
  assert.equal(typeof md, 'string');
  for (const s of ["| 12 | \\(route 2\\) | the route has no id; give it one so logs, metrics and tracing name it |", "| 18 | \\(route 2\\) | to direct:missing: no route in this file consumes from it |", "| 19 | \\(route 3\\) | the route has no id; give it one so logs, metrics and tracing name it |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportErrorHandling example 1", () => {
  const md = core.reportErrorHandling("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n");
  assert.equal(typeof md, 'string');
  for (const s of ["The file defines 1 global error handler (onException, errorHandler or deadLetterChannel outside the routes); they apply to every route.", "| 8 | orders-in | no |", "| 14 | validate | no |", "| 20 | \\(route 3\\) | no |", "| 24 | validate | yes (2) |", "3 routes with no error handling of their own use the global error handler."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportErrorHandling example 2", () => {
  const md = core.reportErrorHandling("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n");
  assert.equal(typeof md, 'string');
  for (const s of ["The file defines no global error handler.", "3 routes without any error handling: a failure goes to the default error handler, with no redelivery and no dead letter channel; the exception is logged and returned to the consumer."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSecurity example 1", () => {
  const md = core.reportSecurity("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example routes -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <onException>\n    <exception>java.io.IOException</exception>\n    <redeliveryPolicy maximumRedeliveries=\"3\"/>\n  </onException>\n  <route id=\"orders-in\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate\"/>\n    <wireTap uri=\"seda:audit\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"direct:validate\"/>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n    <toD uri=\"sql:insert into orders values (:#${body})\"/>\n    <to uri=\"direct:notify\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=60000\"/>\n    <to uri=\"exec:rm?args=-rf /tmp/old\"/>\n  </route>\n  <route id=\"validate\">\n    <from uri=\"sftp://ops@files.example.test/out?password={{sftp.password}}\"/>\n    <doTry>\n      <to uri=\"ftp://files.example.test/in?password=plain123\"/>\n      <doCatch><exception>java.lang.Exception</exception></doCatch>\n    </doTry>\n  </route>\n</routes>\n");
  assert.equal(typeof md, 'string');
  for (const s of ["5 findings.", "| 16 | validate | credentials_in_uri | option authPassword has a literal value; use a property placeholder such as \\{\\{name\\}\\} |", "| 16 | validate | plaintext_transport | http sends data unencrypted; use the TLS variant \\(https, ftps or sftp\\) |", "| 22 | \\(route 3\\) | exec_component | the exec component runs operating system commands |", "| 27 | validate | credentials_in_uri | option password has a literal value; use a property placeholder such as \\{\\{name\\}\\} |", "| 27 | validate | plaintext_transport | ftp sends data unencrypted; use the TLS variant \\(https, ftps or sftp\\) |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSecurity example 2", () => {
  const md = core.reportSecurity("# Invented example routes (YAML DSL)\n- route:\n    id: ticker\n    from:\n      uri: \"timer:tick?period=5000\"\n      steps:\n        - setBody:\n            simple: \"hello\"\n        - to:\n            uri: \"seda:greetings\"\n        - to: \"log:info\"\n- route:\n    from:\n      uri: \"seda:greetings\"\n      steps:\n        - to:\n            uri: \"kafka:greetings?brokers=localhost:9092&saslJaasConfig=RAW({{kafka.jaas}})\"\n        - to: \"direct:missing\"\n- from:\n    uri: \"direct:legacy\"\n    steps:\n      - to: \"http://old.example.test/hook?token=abc123\"\n");
  assert.equal(typeof md, 'string');
  for (const s of ["| 22 | \\(route 3\\) | credentials_in_uri | option token has a literal value; use a property placeholder such as \\{\\{name\\}\\} |", "| 22 | \\(route 3\\) | plaintext_transport | http sends data unencrypted; use the TLS variant \\(https, ftps or sftp\\) |"]) assert.ok(md.includes(s), 'missing: ' + s);
});
