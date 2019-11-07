import * as AWS from 'aws-sdk';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { debug } from './OpsDebug';
const Async = require('async');

export async function createInstanceProfile(
  awsConfig: IAwsConfig,
  instanceProfileName: string,
  policyArns?: string[],
  inlinePolicy?: object
) {
  debug('IN CREATE INSTANCE PROFILE');

  await createRole(awsConfig, instanceProfileName, policyArns, inlinePolicy, {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'ec2.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  });

  let ctx: any = { instanceProfileName };

  AWS.config.apiVersions = {
    iam: '2010-05-08',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let iam = new AWS.IAM(options);

  return new Promise((resolve, reject) => {
    return Async.series(
      [(cb: any) => createInstanceProfile(cb), (cb: any) => addRoleToInstanceProfile(cb)],
      (e: any) => {
        if (e) return reject(e);
        debug(`INSTANCE PROFILE ${instanceProfileName} CREATED AND CONFIGURED`);
        resolve();
      }
    );
  });

  function createInstanceProfile(cb: any) {
    debug(`Creating instance profile ${ctx.instanceProfileName}...`);
    return iam.createInstanceProfile(
      {
        InstanceProfileName: ctx.instanceProfileName,
      },
      (e, d) => {
        if (e && e.code !== 'EntityAlreadyExists') return cb(e);
        debug(`Instance profile ${ctx.instanceProfileName} created`);
        return iam.waitFor('instanceProfileExists', { InstanceProfileName: ctx.instanceProfileName }, cb);
      }
    );
  }

  function addRoleToInstanceProfile(cb: any) {
    debug(`Adding role to instance profile ${ctx.instanceProfileName}...`);
    return iam.getInstanceProfile(
      {
        InstanceProfileName: ctx.instanceProfileName,
      },
      (e, d) => {
        if (e) return cb(e);
        if (d.InstanceProfile.Roles.length > 0) {
          debug(`Instance profile ${ctx.instanceProfileName} already has the role added`);
          return cb();
        }
        return iam.addRoleToInstanceProfile(
          {
            InstanceProfileName: ctx.instanceProfileName,
            RoleName: ctx.instanceProfileName,
          },
          e => {
            if (e) return cb(e);
            debug(`Added role to instance profile ${ctx.instanceProfileName}`);
            return cb();
          }
        );
      }
    );
  }
}

export async function createRole(
  awsConfig: IAwsConfig,
  roleName: string,
  policyArns?: string[],
  inlinePolicy?: object,
  assumeRolePolicy?: object
) {
  debug('IN CREATE ROLE');

  assumeRolePolicy = assumeRolePolicy || {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  };

  let ctx: any = { roleName, policyArns, inlinePolicy, assumeRolePolicy };

  AWS.config.apiVersions = {
    iam: '2010-05-08',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let iam = new AWS.IAM(options);

  return new Promise((resolve, reject) => {
    return Async.series(
      [(cb: any) => createRole(cb), (cb: any) => addPoliciesToRole(cb), (cb: any) => updateInlinePolicy(cb)],
      (e: any) => {
        if (e) return reject(e);
        debug(`ROLE ${roleName} CREATED AND CONFIGURED`);
        resolve();
      }
    );
  });

  function createRole(cb: any) {
    debug(`Creating role ${ctx.roleName}...`);
    return iam.createRole(
      {
        RoleName: ctx.roleName,
        AssumeRolePolicyDocument: JSON.stringify(ctx.assumeRolePolicy),
      },
      (e, d) => {
        if (e && e.code !== 'EntityAlreadyExists') return cb(e);
        debug(`Role ${roleName} created`);
        return iam.waitFor('roleExists', { RoleName: ctx.roleName }, cb);
      }
    );
  }

  function addPoliciesToRole(cb: any) {
    if (!ctx.policyArns) return cb();
    debug(`Adding policies ${ctx.policyArns} to role ${ctx.roleName}...`);
    return Async.eachSeries(
      ctx.policyArns,
      (policyArn: string, cb: any) => {
        return iam.attachRolePolicy(
          {
            PolicyArn: policyArn,
            RoleName: ctx.roleName,
          },
          cb
        );
      },
      (e: any) => {
        if (e) return cb(e);
        debug(`Added policies to role ${ctx.roleName}.`);
        return cb();
      }
    );
  }

  function updateInlinePolicy(cb: any) {
    if (!ctx.inlinePolicy) return cb();
    debug(`Updating inline policy of role ${ctx.roleName}...`);
    return iam.putRolePolicy(
      {
        PolicyDocument: JSON.stringify(ctx.inlinePolicy),
        PolicyName: `${ctx.roleName}-inline-policy`,
        RoleName: ctx.roleName,
      },
      (e: any) => {
        if (e) return cb(e);
        debug(`Updated inline policy of role ${ctx.roleName}.`);
        return cb();
      }
    );
  }
}