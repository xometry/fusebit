import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';

// ------------------
// Internal Constants
// ------------------

const testUsers: string[] = [];
const testClients: string[] = [];
const testIssuers: string[] = [];

// -------------------
// Exported Interfaces
// -------------------

export interface IListUserOptions {
  count?: number;
  next?: string;
  name?: string;
  email?: string;
  issuerId?: string;
  subject?: string;
  include?: boolean;
  exact?: boolean;
}

export interface IListClientOptions {
  count?: number;
  next?: string;
  name?: string;
  issuerId?: string;
  subject?: string;
  include?: boolean;
  exact?: boolean;
}

// ------------------
// Exported Functions
// ------------------

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deleteFunction(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function putFunction(account: IAccount, boundaryId: string, functionId: string, spec: any) {
  return await request({
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
    data: spec,
  });
}

export async function getBuild(account: IAccount, build: { boundaryId: string; functionId: string; buildId: string }) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${
      build.boundaryId
    }/function/${build.functionId}/build/${build.buildId}`,
  });
}

export async function waitForBuild(
  account: IAccount,
  build: { boundaryId: string; functionId: string; buildId: string },
  count: number,
  delay: number
) {
  let totalWait = count * delay;
  while (true) {
    let response = await getBuild(account, build);
    if (response.status !== 201) {
      return response;
    }
    if (count <= 0) {
      throw new Error(`Build did not complete within ${totalWait} ms`);
    }
    count--;
    await sleep(delay);
  }
}

export async function getFunction(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function getFunctionLocation(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}/location`,
  });
}

export async function listFunctions(
  account: IAccount,
  boundaryId?: string,
  cron?: boolean,
  count?: number,
  next?: string
) {
  let url = boundaryId
    ? `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
        account.subscriptionId
      }/boundary/${boundaryId}/function`
    : `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/function`;
  let query = [];
  if (cron !== undefined) {
    query.push(`cron=${cron}`);
  }
  if (count) {
    query.push(`count=${count}`);
  }
  if (next) {
    query.push(`next=${next}`);
  }
  if (query.length > 0) {
    url += `?${query.join('&')}`;
  }
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url,
  });
}

export async function deleteAllFunctions(account: IAccount, boundaryId?: string) {
  let response = await listFunctions(account, boundaryId);
  if (response.status !== 200) {
    throw new Error(
      `The FLEXD_PROFILE does not come with enough permissions to run tests (HTTP ${
        response.status
      }). Unable to list functions in account ${account.accountId}, subscription ${
        account.subscriptionId
      }, boundary ${boundaryId || '*'} on deployment ${account.baseUrl}.`
    );
  }
  return Promise.all(
    response.data.items.map((x: { boundaryId: string; functionId: string }) =>
      deleteFunction(account, x.boundaryId, x.functionId)
    )
  );
}

export async function addIssuer(account: IAccount, issuerId: string, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    testIssuers.push(issuerId);
  }
  return response;
}

export async function listIssuers(account: IAccount, count?: number, next?: string, name?: string) {
  const queryStringParams = [];
  if (count !== undefined) {
    queryStringParams.push(`count=${count}`);
  }
  if (next !== undefined) {
    queryStringParams.push(`next=${encodeURIComponent(next)}`);
  }
  if (name !== undefined) {
    queryStringParams.push(`name=${encodeURIComponent(name)}`);
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer${queryString}`,
  });
  return response;
}

export async function getIssuer(account: IAccount, issuerId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
  });
}

export async function updateIssuer(account: IAccount, issuerId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeIssuer(account: IAccount, issuerId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
  });
}

export async function cleanUpIssuers(account: IAccount) {
  while (testIssuers.length) {
    const toRemove = testIssuers.splice(0, 5);
    await Promise.all(toRemove.map(issuerId => removeIssuer(account, issuerId)));
  }
}

export async function addUser(account: IAccount, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    testUsers.push(response.data.id);
  }
  return response;
}

export async function getUser(account: IAccount, userId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
  });
}

export async function listUsers(account: IAccount, options?: IListUserOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
    if (options.name !== undefined) {
      queryStringParams.push(`name=${encodeURIComponent(options.name)}`);
    }
    if (options.email !== undefined) {
      queryStringParams.push(`email=${encodeURIComponent(options.email)}`);
    }
    if (options.issuerId !== undefined) {
      queryStringParams.push(`issuerId=${encodeURIComponent(options.issuerId)}`);
    }
    if (options.subject !== undefined) {
      queryStringParams.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.include === true) {
      queryStringParams.push(`include=all`);
    }
    if (options.exact === true) {
      queryStringParams.push(`exact=true`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user${queryString}`,
  });
  return response;
}

export async function updateUser(account: IAccount, userId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeUser(account: IAccount, userId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
  });
}

export async function cleanUpUsers(account: IAccount) {
  while (testUsers.length) {
    const toRemove = testUsers.splice(0, 5);
    await Promise.all(toRemove.map(userId => removeUser(account, userId)));
  }
}

export async function addClient(account: IAccount, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    testClients.push(response.data.id);
  }
  return response;
}

export async function getClient(account: IAccount, clientId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
  });
}

export async function listClients(account: IAccount, options?: IListClientOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
    if (options.name !== undefined) {
      queryStringParams.push(`name=${encodeURIComponent(options.name)}`);
    }
    if (options.issuerId !== undefined) {
      queryStringParams.push(`issuerId=${encodeURIComponent(options.issuerId)}`);
    }
    if (options.subject !== undefined) {
      queryStringParams.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.include === true) {
      queryStringParams.push(`include=all`);
    }
    if (options.exact === true) {
      queryStringParams.push(`exact=true`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client${queryString}`,
  });
  return response;
}

export async function updateClient(account: IAccount, clientId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeClient(account: IAccount, clientId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
  });
}

export async function cleanUpClients(account: IAccount) {
  while (testClients.length) {
    const toRemove = testClients.splice(0, 5);
    await Promise.all(toRemove.map(clientId => removeClient(account, clientId)));
  }
}
