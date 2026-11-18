'use strict';
// Integration Route Atlas core: XML and YAML route reading, endpoints, route check, error handling and security review.

const esc = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1')
  .split('://').join('\\:\\/\\/').replace(/(^|[^A-Za-z0-9])www\./gi, (m, pre) => pre + m.slice(pre.length, pre.length + 3) + '\\.');
const cell = (s) => { s = String(s == null ? '' : s); return s === '' ? '-' : esc(s); };
const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const ROLES = ['from', 'to', 'toD', 'wireTap', 'enrich', 'pollEnrich', 'inOnly', 'inOut'];
const HANDLERS = ['onException', 'errorHandler', 'doTry', 'deadLetterChannel', 'doCatch'];
const unxml = (s) => String(s).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function lineStarts(s) { const st = [0]; for (let p = s.indexOf('\n'); p >= 0; p = s.indexOf('\n', p + 1)) st.push(p + 1); return st; }
function lineFrom(st, idx) { let lo = 0, hi = st.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (st[mid] <= idx) lo = mid; else hi = mid - 1; } return lo + 1; }

// The component of an endpoint URI: the text before the first ':' (lower-case), '' when there is none.
function componentOf(uri) { const m = /^\s*([A-Za-z][A-Za-z0-9+.-]*):/.exec(String(uri == null ? '' : uri)); return m ? m[1].toLowerCase() : ''; }

// -> { kind: 'xml'|'yaml'|'', routes: [{id, line, endpoints: [{role, uri, line}], handlers: n}], globalHandlers: n }
function parseRoutes(text) {
  const s = String(text == null ? '' : text).replace(/^﻿/, '');
  if (/<\s*(routes|route|camelContext|routeContext)\b/.test(s)) return parseXml(s);
  if (/^\s*-\s*(route|from)\s*:/m.test(s)) return parseYaml(s);
  return { kind: '', routes: [], globalHandlers: 0 };
}
function parseXml(raw) {
  const s = raw.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));
  const st = lineStarts(s); const routes = []; let cur = null, globalHandlers = 0;
  const re = /<\s*(\/?)\s*([A-Za-z][\w.-]*:)?([A-Za-z][\w-]*)\b([^>]*?)(\/?)>/g; let m;
  while ((m = re.exec(s))) {
    const closing = m[1] === '/', name = m[3], attrs = m[4], line = lineFrom(st, m.index);
    if (name === 'route') {
      if (closing) { cur = null; continue; }
      const id = /\bid\s*=\s*"([^"]*)"|\bid\s*=\s*'([^']*)'/.exec(attrs);
      cur = { id: id ? unxml(id[1] !== undefined ? id[1] : id[2]) : '', line, endpoints: [], handlers: 0 }; routes.push(cur);
      if (m[5] === '/') cur = null;
      continue;
    }
    if (closing) continue;
    if (ROLES.includes(name)) {
      const u = /\buri\s*=\s*"([^"]*)"|\buri\s*=\s*'([^']*)'/.exec(attrs);
      if (cur) cur.endpoints.push({ role: name, uri: u ? unxml(u[1] !== undefined ? u[1] : u[2]) : '', line });
      continue;
    }
    if (HANDLERS.includes(name)) { if (cur) cur.handlers++; else globalHandlers++; }
  }
  return { kind: 'xml', routes, globalHandlers };
}
function parseYaml(s) {
  const lines = s.split('\n').map((l) => l.replace(/\r$/, ''));
  const routes = []; let cur = null, globalHandlers = 0; const stack = []; // [{indent, key}]
  const unq = (v) => v.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  lines.forEach((l, i) => {
    const n = i + 1;
    if (!l.trim() || /^\s*#/.test(l)) return;
    const m = /^(\s*)(-\s+)?([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(l);
    if (!m) return;
    const indent = m[1].length + (m[2] ? m[2].length : 0), key = m[3], val = m[4];
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (m[1].length === 0 && m[2]) {                       // a top-level list item starts a route ('- route:' or '- from:') or a global element
      if (key === 'route' || key === 'from') { cur = { id: '', line: n, endpoints: [], handlers: 0 }; routes.push(cur); }
      else { cur = null; if (HANDLERS.includes(key)) globalHandlers++; }
    } else if (cur) {
      if (key === 'id' && stack.length && stack[stack.length - 1].key === 'route' && !cur.id) cur.id = unq(val);
      if (HANDLERS.includes(key)) cur.handlers++;
      if (ROLES.includes(key) && val && !/^\{/.test(val)) cur.endpoints.push({ role: key, uri: unq(val), line: n });
      if (key === 'uri') { const parent = [...stack].reverse().find((x) => ROLES.includes(x.key)); if (parent) cur.endpoints.push({ role: parent.key, uri: unq(val), line: n }); }
    }
    if (m[1].length === 0 && m[2] && (key === 'from')) { if (val) cur.endpoints.push({ role: 'from', uri: unq(val), line: n }); }
    stack.push({ indent, key });
  });
  return { kind: 'yaml', routes, globalHandlers };
}

const NONE = (h) => '# ' + h + '\n\nThis file contains no Camel routes (XML with <route> or YAML with - route: or - from:).';
const label = (r, k) => r.id || '(route ' + (k + 1) + ')';

function reportSummary(text) {
  const P = parseRoutes(text); const H = 'Route Summary'; if (!P.routes.length) return NONE(H);
  const eps = P.routes.flatMap((r) => r.endpoints); const comps = new Map();
  eps.forEach((e) => { const c = componentOf(e.uri) || '(none)'; comps.set(c, (comps.get(c) || 0) + 1); });
  return '# ' + H + '\n\n' + (P.kind === 'xml' ? 'XML' : 'YAML') + ' routes: ' + pl(P.routes.length, 'route') + ', ' + pl(eps.length, 'endpoint') + ', ' + pl(comps.size, 'component') + '.' +
    (comps.size ? '\n\n| Component | Endpoints |\n| --- | ---: |\n' + [...comps.entries()].sort((a, b) => b[1] - a[1] || byText(a[0], b[0])).map(([c, n]) => '| ' + cell(c) + ' | ' + n + ' |').join('\n') : '');
}

function reportEndpoints(text) {
  const P = parseRoutes(text); const H = 'Endpoints'; if (!P.routes.length) return NONE(H);
  const rows = []; P.routes.forEach((r, k) => r.endpoints.forEach((e) => rows.push('| ' + e.line + ' | ' + cell(label(r, k)) + ' | ' + e.role + ' | ' + cell(componentOf(e.uri)) + ' | ' + cell(e.uri) + ' |')));
  if (!rows.length) return '# ' + H + '\n\nNo endpoints.';
  return '# ' + H + '\n\n| Line | Route | Role | Component | URI |\n| ---: | --- | --- | --- | --- |\n' + rows.join('\n');
}

const INTERNAL = ['direct', 'seda', 'vm', 'direct-vm'];
// Endpoint key for in-memory endpoints: component + ':' + name (options after '?' dropped).
const internalKey = (uri) => { const c = componentOf(uri); if (!INTERNAL.includes(c)) return ''; return c + ':' + String(uri).trim().slice(c.length + 1).split('?')[0].replace(/^\/\//, ''); };

function reportRouteCheck(text) {
  const P = parseRoutes(text); const H = 'Route Check'; if (!P.routes.length) return NONE(H);
  const p = []; const ids = new Map();
  const consumed = new Set(P.routes.flatMap((r) => r.endpoints.filter((e) => e.role === 'from').map((e) => internalKey(e.uri)).filter(Boolean)));
  P.routes.forEach((r, k) => {
    if (!r.id) p.push([r.line, label(r, k), 'the route has no id; give it one so logs, metrics and tracing name it']);
    else if (ids.has(r.id)) p.push([r.line, r.id, 'route id ' + r.id + ' is also used on line ' + ids.get(r.id)]); else ids.set(r.id, r.line);
    const froms = r.endpoints.filter((e) => e.role === 'from');
    if (!froms.length) p.push([r.line, label(r, k), 'the route has no from endpoint']);
    else if (froms.length > 1) p.push([froms[1].line, label(r, k), 'the route has more than one from endpoint']);
    r.endpoints.forEach((e) => {
      if (!e.uri) p.push([e.line, label(r, k), e.role + ' has no uri']);
      const key = internalKey(e.uri);
      if (e.role !== 'from' && key && !consumed.has(key)) p.push([e.line, label(r, k), e.role + ' ' + key + ': no route in this file consumes from it']);
    });
  });
  if (!p.length) return '# ' + H + '\n\nNo problems found.';
  p.sort((a, b) => a[0] - b[0]);
  return '# ' + H + '\n\n' + pl(p.length, 'problem') + ' found.\n\n| Line | Route | Problem |\n| ---: | --- | --- |\n' + p.map((x) => '| ' + x[0] + ' | ' + cell(x[1]) + ' | ' + cell(x[2]) + ' |').join('\n');
}

function reportErrorHandling(text) {
  const P = parseRoutes(text); const H = 'Error Handling'; if (!P.routes.length) return NONE(H);
  const without = P.routes.map((r, k) => ({ r, k })).filter(({ r }) => !r.handlers);
  let md = '# ' + H + '\n\n' + (P.globalHandlers ? 'The file defines ' + pl(P.globalHandlers, 'global error handler') + ' (onException, errorHandler or deadLetterChannel outside the routes); they apply to every route.' : 'The file defines no global error handler.');
  md += '\n\n| Line | Route | Own error handling |\n| ---: | --- | --- |\n' + P.routes.map((r, k) => '| ' + r.line + ' | ' + cell(label(r, k)) + ' | ' + (r.handlers ? 'yes (' + r.handlers + ')' : 'no') + ' |').join('\n');
  md += '\n\n' + (without.length && !P.globalHandlers ? pl(without.length, 'route') + ' without any error handling: a failure goes to the default error handler, with no redelivery and no dead letter channel; the exception is logged and returned to the consumer.'
    : without.length ? pl(without.length, 'route') + ' with no error handling of their own use the global error handler.' : 'Every route has its own error handling.');
  return md;
}

const SECRET = /[?&]([A-Za-z]*(?:password|passphrase|secret|secretKey|accessKey|apiKey|token|privateKey))=([^&]*)/gi;   // any option name ending in one of these (authPassword, proxyAuthPassword ...)
function reportSecurity(text) {
  const P = parseRoutes(text); const H = 'Security Review'; if (!P.routes.length) return NONE(H);
  const f = [];
  P.routes.forEach((r, k) => r.endpoints.forEach((e) => {
    const u = e.uri; let m; SECRET.lastIndex = 0;
    while ((m = SECRET.exec(u))) { const v = m[2]; if (v && !/^(RAW\()?\{\{.*\}\}\)?$/.test(v) && !/^(RAW\()?\$\{.*\}\)?$/.test(v)) f.push([e.line, label(r, k), 'credentials_in_uri', 'option ' + m[1] + ' has a literal value; use a property placeholder such as {{name}}']); }
    if (/^[A-Za-z][\w+.-]*:\/\/[^/@\s]+:[^/@\s]+@/.test(u)) f.push([e.line, label(r, k), 'credentials_in_uri', 'the URI contains user:password@']);
    const c = componentOf(u);
    if (['http', 'ftp', 'telnet'].includes(c) || ((c === 'netty-http' || c === 'vertx-http' || c === 'ahc') && /^\S+:http:/.test(u))) f.push([e.line, label(r, k), 'plaintext_transport', c + ' sends data unencrypted; use the TLS variant (https, ftps or sftp)']);
    if (c === 'exec') f.push([e.line, label(r, k), 'exec_component', 'the exec component runs operating system commands']);
  }));
  if (!f.length) return '# ' + H + '\n\nNo findings.';
  f.sort((a, b) => a[0] - b[0] || byText(a[2], b[2]));
  return '# ' + H + '\n\n' + pl(f.length, 'finding') + '.\n\n| Line | Route | Check | Finding |\n| ---: | --- | --- | --- |\n' + f.map((x) => '| ' + x[0] + ' | ' + cell(x[1]) + ' | ' + x[2] + ' | ' + cell(x[3]) + ' |').join('\n');
}

module.exports = { componentOf, routeIds: (t) => parseRoutes(t).routes.map((r) => r.id), reportSummary, reportEndpoints, reportRouteCheck, reportErrorHandling, reportSecurity };

// Caps every Markdown table of a report at 500 rows and says how many there were.
function capTables(md) {
  if (typeof md !== 'string') return md;
  const lines = md.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].startsWith('|') && /^\|[ :-]+\|/.test(lines[i + 1] || '')) {
      out.push(lines[++i]);
      let n = 0;
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) { i++; n++; if (n <= 500) out.push(lines[i]); }
      if (n > 500) { out.push(''); out.push('Showing the first 500 of ' + n + ' rows.'); }
    }
  }
  return out.join('\n');
}
for (const k of Object.keys(module.exports)) {
  if (k.startsWith('report')) { const f = module.exports[k]; module.exports[k] = function (text) { return capTables(f(text)); }; }
}
