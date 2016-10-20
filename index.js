'use strict';

var Lynx = require('lynx');
var l = require('lodash');
var debug = require('debug')('plugins:statsd');

module.exports = StatsDPlugin;

function StatsDPlugin(config, ee) {
  var self = this;
  self._report = [];

  debug('StatsD Configuration: '+JSON.stringify(config.plugins.statsd));

  var host = config.plugins.statsd.host || 'localhost';
  var port = config.plugins.statsd.port || 8125;
  var prefix = config.plugins.statsd.prefix || 'artillery';
  var closingTimeout = config.plugins.statsd.timeout || 0;
  // This is used for testing the plugin interface
  var enableUselessReporting = config.plugins.statsd.enableUselessReporting;

  var metrics = new Lynx(host, port);

  ee.on('stats', function(statsObject) {
    var stats = statsObject.report()
    debug('Stats Report from Artillery: '+JSON.stringify(stats));

    if (enableUselessReporting) {
      self._report.push({ timestamp: stats.timestamp, value: 'test' });
    }

    metrics.gauge(prefix + '.scenariosCreated', stats.scenariosCreated || -1);
    metrics.gauge(prefix + '.scenariosCompleted', stats.scenariosCompleted || -1);
    metrics.gauge(prefix + '.requestsCompleted', stats.requestsCompleted || -1);
    metrics.gauge(prefix + '.concurrency', stats.concurrency || -1);

    metrics.gauge(prefix + '.latency.min', stats.latency.min || -1);
    metrics.gauge(prefix + '.latency.max', stats.latency.max || -1);
    metrics.gauge(prefix + '.latency.median', stats.latency.median || -1);
    metrics.gauge(prefix + '.latency.p95', stats.latency.p95 || -1);
    metrics.gauge(prefix + '.latency.p99', stats.latency.p99 || -1);

    metrics.gauge(prefix + '.rps.count', stats.rps.count || -1);
    metrics.gauge(prefix + '.rps.mean', stats.rps.mean || -1);

    metrics.gauge(prefix + '.scenarioDuration.min', stats.scenarioDuration.min || -1);
    metrics.gauge(prefix + '.scenarioDuration.max', stats.scenarioDuration.max || -1);
    metrics.gauge(prefix + '.scenarioDuration.median', stats.scenarioDuration.median || -1);
    metrics.gauge(prefix + '.scenarioDuration.p95', stats.scenarioDuration.p95 || -1);
    metrics.gauge(prefix + '.scenarioDuration.p99', stats.scenarioDuration.p99 || -1);

    l.each(stats.errors, function(count, errName) {
      metrics.gauge(prefix + '.errors.' + errName, count || -1);
    });

    l.each(stats.codes, function(count, codeName) {
      metrics.gauge(prefix + '.codes.' + codeName, count || -1);
    });
  });

  ee.on('done', function(stats) {
    debug('done');
    if (closingTimeout > 0) {
      setTimeout(function () {
        metrics.close();
      }, closingTimeout);
    } else {
      metrics.close();
    }
  });

  return this;
}

StatsDPlugin.prototype.report = function report() {
  if (this._report.length === 0) {
    return null;
  } else {
    this._report.push({
      timestamp: 'aggregate',
      value: {test: 'aggregate test'}
    });
    return this._report;
  }
};
