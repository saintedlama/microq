const Queue = require('./lib/queue');

module.exports = function(connectionUrl, options) {
  return new Queue(connectionUrl, options);
}