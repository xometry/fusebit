const Assert = require('assert');
const Async = require('async');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_delete_function(req, res, next) {
  return module.exports.core(req.params, (e, r) => {
    if (e) {
      return next(create_error(500, `Error deleting function: ${e.message}.`));
    }
    res.status(204);
    return res.end();
  });
};

module.exports.core = function lambda_delete_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be valid');
  Assert.equal(typeof options.functionId, 'string', 'options.functionId name must be specified');
  Assert.ok(options.functionId.match(Common.valid_function_name), 'function name must be valid');

  return Async.series(
    [
      cb => delete_cron(options, cb),
      cb => delete_deployment_package(options, cb),
      cb => delete_function_spec(options, cb),
      cb => delete_user_function(options, cb),
    ],
    e => (e ? cb(e) : cb())
  );
};

function delete_cron(options, cb) {
  return Common.S3.listObjectsV2(
    {
      Prefix: Common.get_cron_key_prefix(options),
    },
    (e, d) => {
      if (e) return cb(e);
      return Async.eachLimit(d.Contents || [], 5, (i, cb) => Common.S3.deleteObject({ Key: i.Key }, cb), cb);
    }
  );
}

function delete_deployment_package(options, cb) {
  return Common.S3.deleteObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_build_key(options),
    },
    e => (e ? cb(e) : cb())
  );
}

function delete_function_spec(options, cb) {
  return Common.S3.deleteObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(options),
    },
    e => (e ? cb(e) : cb())
  );
}

function delete_user_function(options, cb) {
  return Common.Lambda.deleteFunction(
    {
      FunctionName: Common.get_user_function_name(options),
    },
    e => (e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb())
  );
}