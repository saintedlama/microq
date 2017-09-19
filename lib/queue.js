const { EventEmitter } = require('events');
const mongoist = require('mongoist');
const debug = require('debug')('microq');

module.exports = class Queue extends EventEmitter {
  constructor(connectionUrl, connectionOptions) {
    super();
    
    this.db = mongoist(connectionUrl, connectionOptions);
    this.jobs = this.db.jobs;
  }

  enqueue(name, params, options) {
    options = options || {};

    var job = {
        name: name,
        status: 'enqueued',
        params: params,
        priority: options.priority,
        enqueuedAt: new Date(),
    };
    
    debug(`Enqueuing job ${name}`);

    return this.jobs.insert(job);
  }

  async start(workers, options) {
    options = options || {};
    options.interval = options.interval || 5000;
    options.recover = (options.recover === false) ? options.recover : true;
    options.parallel = (options.parallel === undefined) ? true : !!options.parallel;

    this.started  = true;

    if (options.recover) {
      await this.recover();
    }

    const poll = async () => {
      if (!this.started) {
        return;
      }

      const job = await this.dequeue(workers);
      
      if (!job) {
        setTimeout(poll, options.interval);

        return;
      }

      if (options.parallel) {
        this.executeWorker(workers[job.name], job);
      } else {
        await this.executeWorker(workers[job.name], job);
      }

      setImmediate(poll);
    }

    poll();
  }

  async executeWorker(worker, job) {
    debug(`Processing worker for job ${job.name}...`);

    try {
      const result = await worker(job.params, job);

      const jobResult = await this.jobs.findAndModify({ 
        query: { _id: job._id }, 
        update: { $set: { status: 'completed', result, endedAt: new Date() }},
        new: true
      });

      debug(`Worker for job ${job.name} completed`);

      this.emit('completed', jobResult);
    } catch (e) {
      const jobResult = await this.jobs.findAndModify({ 
        query: { _id: job._id }, 
        update: { $set: { status: 'failed', error: e.message, stack: e.stack, endedAt: new Date() }},
        new: true
      });

      debug(e, `Worker for job ${job.name} failed`);

      this.emit('failed', jobResult);
    }
  }

  async dequeue(workers) {
    const query = {
      status: 'enqueued',
      name: { $in: Object.keys(workers) }
    };

    const sort = {
      priority: -1,
      _id: 1
    };

    const update = { $set: { status: 'dequeued', dequeuedAt: new Date() }};
    
    debug(`Polling job queue for new jobs`);

    const job = await this.jobs.findAndModify({
      query: query,
      sort: sort,
      update: update,
      new: true
    });

    if (!job) {
      debug(`Job queue is empty`);
      this.emit('empty');
    }

    return job;
  }

  recover() {
    return this.jobs.update({ status: 'dequeued' }, { $set: { status: 'enqueued', recoveredAt: new Date() }}, { multi: true});
  }

  query(status) {
    status = status || 'enqueued';

    return this.jobs.find({ status });
  }

  cleanup(beforeDate) {
    beforeDate = beforeDate || new Date();

    return this.jobs.remove({ status: { $in: ['completed', 'failed' ]}, enqueuedAt: { $lte: beforeDate }});
  }

  stop() {
    this.started  = false;
  }
}