import { Express, NextFunction, Request, Response } from 'express';
import express from 'express';

import bodyParser from 'body-parser';

import * as fs from 'fs';
import * as http from 'http';

const libnpm = require('libnpm');

import { AddressInfo } from 'net';

import { packageGet, packagePut, revisionDelete, revisionPut, searchGet, tarballDelete, tarballGet } from '../src';
import { IFunctionApiRequest } from '../src/request';

import { MemRegistry } from '@5qtrs/registry';

let logEnabled = false;

const enableForceClose = (server: http.Server) => {
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => {
      sockets.delete(socket);
    });
  });

  return () => {
    sockets.forEach((s: any) => s.destroy());
  };
};

const startServer = async (app: express.Application) => {
  const server = http.createServer(app);
  const forceClose = enableForceClose(server);
  const port: number = await new Promise((resolve, reject) => {
    server.listen(0, () => {
      resolve((server.address() as AddressInfo).port);
    });
  });

  return { server, forceClose, port };
};

const startExpress = async (): Promise<any> => {
  const app = express();
  const { server, forceClose, port } = await startServer(app);

  const { registry, handler } = MemRegistry.handler();

  const url = `http://localhost:${port}`;

  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).tarballRootUrl = url;
    return next();
  });

  app.use(bodyParser.json());
  app.use(handler);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (logEnabled) {
      console.log(`${req.method} ${req.url}\n${JSON.stringify(req.headers)}\n${JSON.stringify(req.body, null, 2)}`);
    }
    return next();
  });

  return { app, registry, server, forceClose, port, url };
};

let globalServer: any;

beforeEach(async () => {
  globalServer = await startExpress();
});

afterEach(async () => {
  globalServer.forceClose();
  await new Promise((resolve, reject) => globalServer.server.close(resolve));
});

const createServer = () => {
  const { app, registry, server, forceClose, port, url } = globalServer;
  app.put('/:name', packagePut());
  app.get('/:name', packageGet());
  app.get('/:scope?/:name/-/:scope2?/:filename/', tarballGet());
  app.get('/-/v1/search', searchGet());
  app.delete('/:name/-rev/:revisionId', revisionDelete());
  app.put('/:name/-rev/:revisionId', revisionPut());

  app.delete('/:scope/:name/-/:scope2/:filename/-rev/:revisionId', tarballDelete());
  return { registry, url: `${url}/` };
};

describe('packagePut', () => {
  it('putAddsRegistry', async () => {
    const { registry, url } = createServer();

    const manifest = require('./mock/sample-npm.manifest.json');
    const tarData = fs.readFileSync('test/mock/sample-npm.tgz');

    let m: any;

    // Publish a package
    await libnpm.publish(manifest, tarData, { registry: url });
    expect(registry.registry.pkg['@testscope/foobar'].name).toBeTruthy();
    expect(registry.registry.pkg['@testscope/foobar'].versions[manifest.version].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '1.0.0',
    });

    // Add another version
    manifest.version = '2.0.1';
    await libnpm.publish(manifest, tarData, { registry: url });
    expect(Object.keys(registry.registry.pkg['@testscope/foobar'].versions)).toStrictEqual(['1.0.0', '2.0.1']);

    expect(registry.registry.pkg['@testscope/foobar'].versions['1.0.0'].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '1.0.0',
    });

    expect(registry.registry.pkg['@testscope/foobar'].versions['2.0.1'].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '2.0.1',
    });

    // Get a package
    m = await libnpm.manifest('@testscope/foobar', { registry: url });
    expect(m.name).toBe('@testscope/foobar');

    // Get a tarball
    m = await libnpm.tarball('@testscope/foobar', { registry: url });
    expect(m).toHaveLength(tarData.length);
    expect(m.equals(tarData)).toBeTruthy();

    // Search for a package
    m = await libnpm.search('xxx', { registry: url });
    expect(m).toHaveLength(0);
    m = await libnpm.search('foo', { registry: url });
    expect(m).toHaveLength(1);

    expect(registry.registry.pkg['@testscope/foobar'].versions['1.0.0'].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '1.0.0',
    });

    expect(registry.registry.pkg['@testscope/foobar'].versions['2.0.1'].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '2.0.1',
    });

    // Unpublish a version
    await libnpm.unpublish('@testscope/foobar@2.0.1', { registry: url });
    expect(Object.keys(registry.registry.pkg['@testscope/foobar'].versions)).toStrictEqual(['1.0.0']);
    expect(registry.registry.pkg['@testscope/foobar'].versions['1.0.0'].dist.tarball).toMatchObject({
      scope: '@testscope',
      name: 'foobar',
      version: '1.0.0',
    });

    // Unpublish the last version
    await libnpm.unpublish('@testscope/foobar@1.0.0', { registry: url });
    expect(registry.registry.pkg['@testscope/foobar']).toBeUndefined();
  }, 10000);
});