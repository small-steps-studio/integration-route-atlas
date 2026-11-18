'use strict';
// The sample files of the Open Sample commands. All data is invented for this product; it names no real company, person or system.

const SAMPLES = {
 "openSample": {
  "title": "Open Sample File",
  "fileName": "order-routes.xml",
  "languageId": "xml",
  "text": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Invented example: order intake routes of a small shop -->\n<routes xmlns=\"http://camel.apache.org/schema/spring\">\n  <route id=\"orders-intake\">\n    <from uri=\"file:inbox/orders?move=.done\"/>\n    <unmarshal><json/></unmarshal>\n    <to uri=\"direct:validate-order\"/>\n    <wireTap uri=\"seda:order-audit\"/>\n  </route>\n  <route id=\"validate-order\">\n    <from uri=\"direct:validate-order\"/>\n    <doTry>\n      <to uri=\"bean:orderValidator\"/>\n      <doCatch><exception>java.lang.IllegalArgumentException</exception><to uri=\"direct:rejected\"/></doCatch>\n    </doTry>\n    <to uri=\"http://partner.example.test/api/orders?authUsername=shop&amp;authPassword=s3cret\"/>\n  </route>\n  <route>\n    <from uri=\"timer:cleanup?period=3600000\"/>\n    <to uri=\"exec:/usr/local/bin/cleanup-tmp\"/>\n  </route>\n  <route id=\"orders-intake\">\n    <from uri=\"sftp://ops@files.example.test/outgoing?password={{sftp.password}}\"/>\n    <to uri=\"direct:validate-order\"/>\n  </route>\n</routes>\n"
 }
};

/** The sample with the given id, or null. */
function sampleFor(id) { return SAMPLES[id] || null; }

module.exports = { sampleFor: sampleFor, SAMPLE_IDS: Object.keys(SAMPLES) };
