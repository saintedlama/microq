# microq

[![Build Status](https://travis-ci.org/saintedlama/microq.svg?branch=master)](https://travis-ci.org/saintedlama/microq)
[![Coverage Status](https://coveralls.io/repos/github/saintedlama/microq/badge.svg?branch=master)](https://coveralls.io/github/saintedlama/microq?branch=master)
[![microq analyzed by Codellama.io](https://app.codellama.io/api/badges/5a04388b1b4c363a0f9427b3/4e1ef4e8caa46432342aebc78f892a34)](https://app.codellama.io/repositories/5a04388b1b4c363a0f9427b3)

Microq is a simple but reliable message queue built on mongodb.

## Installation

```bash
$ npm install microq
```

**Notice** microq needs async/await support. So use node.js 8.x please

## Usage

### Adding a job

```javascript
const microq = require('microq');
const queue = microq(connectionUrl);

const job = await queue.enqueue('foo', { data: 'hello' });
```

### Starting workers

```javascript
const microq = require('microq');
const queue = microq(connectionUrl);

queue.start({
  foo(params, job) => {
    // Work on job data passed in params ({ data: 'hello' })
    // To fail, throw an error
    // To succeed return something, even undefined is accepted:)
  }
}, { interval: 500 });
```

**Notice** microq uses the `debug` (https://www.npmjs.com/package/debug) with prefix *microq*. So if you need some log output turn debug on.

## Writing a worker

Microq supports workers to use async/await or to return Promises. A worker may throw an exception to fail. The queue will NOT shut down if a worker fails.

Worker function should return a promise or should be defined as async functions. 

```javascript
async foo(params, job) => {
  await something();

  await somthingOther();

  // ...
  return;
}
```

In case the worker queue is started with option `parallel` set to `false` this allows the worker queue to wait until
the job finishes and to set the status of the job correctly.

## API

### `microq(connectionUrl, [options])`

Creates a new queue connected to a mongodb database specified by connectionUrl. You can optionally pass connection options to mongodb.

### `queue.enqueue(jobName, [params], [options])`

Enqueues a job with name *jobName* and optional params passed to the worker.

**Options**

* *priority* - defines the dequeue priority. jobs with higher priority are dequeued first.

**Returns** a promise resolving to the persisted job

### `queue.start(workers, options)`

Starts the queue with workers passed in the workers object. A worker must be a function.

**Options**

* *recover* (Boolean) - Defines if jobs that are in status *dequeued* should be recovered when starting the queue.  Defaults to `true`.
* *interval* (number in milliseconds) - Defines the poll interval. Defaults to `5000` ms.
* *parallel* (Boolean) - Defines whether jobs are executed in parallel. Defaults to `true`.

### `queue.query(status)`

Query the queue for jobs with the given status. Status must be one of *enqueued*, *dequeued*, *completed*, *failed*.

**Returns** a promise resolving to a list of jobs

### `queue.recover()`

Updates all jobs currently in *dequeue* status to *enqueued* status and adds a date field *recoveredAt*

### `queue.cleanup([date])`

Removes all jobs before a specified date (new Date() if not given) in status *completed* or *failed*.

### `queue.stop()`

Stops polling. No workers are started after stopping the queue.

## Events

The queue object returned by `microq(connectionUrl)` is an EventEmitter emitting events:

* *failed* - A worker failed to process a job
* *completed* - A woker processed a job successfully
* *empty* - The job queue is currently empty
