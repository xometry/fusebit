import create_error from 'http-errors';

import { IAgent } from '@5qtrs/account-data';
import { AwsKeyStore, SubscriptionCache } from '@5qtrs/runas';
import { AwsRegistry } from '@5qtrs/registry';
import { terminate_garbage_collection } from '@5qtrs/function-lambda';
import * as FunctionUtilities from '../../src/routes/functions';

import { disableFunctionUsageRestriction, callFunction, getFunctionLocation, waitForBuild } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const getParams = (functionId: string) => ({
  accountId: account.accountId,
  subscriptionId: account.subscriptionId,
  boundaryId,
  functionId,
});

const logMessage = (exec: any, base: any) => {
  console.log(exec);
  console.log({ body: base.data, bodyEncoding: base.headers['content-type'], code: base.status });
};

const helloWorld = { nodejs: { files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });' } } };

const helloWorldUpdated = {
  nodejs: { files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });' } },
};

const ctxFunction = {
  nodejs: {
    files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: { ...ctx, configuration: undefined } });' },
  },
};

const asyncFunction = {
  nodejs: {
    files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: { ...ctx, configuration: undefined });' },
  },
  compute: {
    staticIp: true,
  },
};

const asyncFailedFunction = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: { ...ctx, configuration: undefined } });',
      'package.json': { dependencies: { superagent: '=0.0.1' } },
    },
  },
};

// Create the keystore and guarantee an initial key
const keyStore = new AwsKeyStore({});

// Create and load a cache with the current subscription->account mapping
const subscriptionCache = new SubscriptionCache({});
subscriptionCache.refresh();

// Register the globals with various consumers
FunctionUtilities.initFunctions(keyStore, subscriptionCache);

// Create a registry object
const registry = AwsRegistry.create({ ...getParams(''), registryId: 'default' }, {});

// Currently fake a permission check since this isn't running as a specific entity.
const fakeAgent = {
  checkPermissionSubset: async () => Promise.resolve(),
};

beforeAll(async () => {
  return keyStore.rekey();
});
afterAll(() => {
  console.log(`Shutting down keyStore`);
  keyStore.shutdown();
  terminate_garbage_collection();
});

describe('Function Utilities', () => {
  test('Create simple function', async () => {
    const params = getParams(function1Id);
    const res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({
      code: 200,
      status: 'success',
      subscriptionId: params.subscriptionId,
      boundaryId: params.boundaryId,
      functionId: function1Id,
      version: 1,
    });
  }, 5000);

  test('Update simple function with no change', async () => {
    disableFunctionUsageRestriction();
    const params = getParams(function1Id);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({ code: 204 });
  }, 5000);

  test('Update simple function with change', async () => {
    disableFunctionUsageRestriction();
    const params = getParams(function1Id);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.createFunction(params, helloWorldUpdated, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({
      code: 200,
      status: 'success',
      subscriptionId: params.subscriptionId,
      boundaryId: params.boundaryId,
      functionId: function1Id,
      version: 2,
    });
  }, 5000);

  test('Create and delete a function', async () => {
    const params = getParams(function1Id);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent, registry);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.deleteFunction(params);
    expect(res).toMatchObject({ code: 204 });
  }, 5000);

  test('Delete a missing function', async () => {
    const params = getParams(function1Id);
    await expect(FunctionUtilities.deleteFunction(params)).rejects.toEqual(create_error(404));
  }, 5000);

  test('Create and invoke a function', async () => {
    const params = getParams(function1Id);
    const create = await FunctionUtilities.createFunction(params, ctxFunction, fakeAgent as IAgent, registry);
    expect(create).toMatchObject({ code: 200 });

    const exec = await FunctionUtilities.executeFunction(params, 'GET', '');
    const base = await callFunction('', create.location as string);

    const bodyParam = ['accountId', 'subscriptionId', 'boundaryId', 'functionId', 'method', 'url', 'body', 'path'];
    bodyParam.forEach((p) => expect(exec.body[p]).toEqual(base.data[p]));
    expect(exec.code).toBe(base.status);
    expect(exec.body.baseUrl.length).toBeGreaterThan(10); // It's there, and long enough.
    expect(exec.body.fusebit.endpoint.length).toBeGreaterThan(10); // Ditto.

    expect(exec.body.method).toBe('GET');
  }, 5000);

  test('Invoke a function with a body payload', async () => {
    const params = getParams(function1Id);
    const create = await FunctionUtilities.createFunction(params, ctxFunction, fakeAgent as IAgent, registry);
    expect(create).toMatchObject({ code: 200 });

    const body = { hello: 'world' };
    const exec = await FunctionUtilities.executeFunction(params, 'POST', '', { body });
    const base = await callFunction('', create.location as string, 'POST', JSON.stringify(body));

    expect(exec.body.method).toBe('POST');
    expect(exec.body.body).toEqual(body);
    expect(base.data.body).toEqual(body);
  }, 5000);

  test('Create a function that requires a build', async () => {
    const params = getParams(function1Id);
    const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
    expect(create).toMatchObject({ code: 201 });

    const build = await FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 10000);
    expect(build).toMatchObject({ code: 200, version: 1 });
  }, 15000);

  test('Create a function with a short timeout fails', async () => {
    const params = getParams(function1Id);
    const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
    expect(create).toMatchObject({ code: 201 });

    expect(FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 1)).rejects.toEqual(
      create_error(408)
    );
  }, 5000);
});