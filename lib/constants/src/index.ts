import Crypto from 'crypto';
import Path from 'path';

import { dynamoScanTable, expBackoff, asyncPool, duplicate, safePath, safePathMap } from './utilities';

interface IModuleSpec {
  registry: string;
  version: string;
}

import { isSpecialized, Permissions, RestrictedPermissions, UserPermissions } from './permissions';

const API_PUBLIC_ENDPOINT = process.env.LOGS_HOST
  ? `https://${process.env.LOGS_HOST}`
  : (process.env.API_SERVER as string);

let builderVersion: string = 'unknown';
try {
  builderVersion = require(Path.join(__dirname, '..', '..', '..', 'package.json')).version;
} catch (_) {}

const valid_boundary_name = /^[A-Za-z0-9\-]{1,63}$/;

const valid_function_name = /^[A-Za-z0-9\-]{1,64}$/;

// Stores status of a function build (async operation)
// This prefix has 1 day TTL in S3
const function_build_status_key_prefix = 'function-build-status';

// Stores the parameters of a function build for the build duration
// This prefix has 1 day TTL in S3
const function_build_request_key_prefix = 'function-build-request';

// Stores lambda deployment package of the current function
// TODO: should this also have TTL?
const function_build_key_prefix = 'function-build';

// Stores the parameters of the current function
const function_spec_key_prefix = 'function-spec';

// Stores registrations of active cron jobs
const cron_key_prefix = 'function-cron';

// Stores built npm modules
const module_key_prefix = 'npm-module';

const REGISTRY_CATEGORY = 'registry-npm-package';
const REGISTRY_CATEGORY_CONFIG = 'registry-npm-config';

const REGISTRY_DEFAULT = 'default';
const REGISTRY_GLOBAL = 'registry-global';

const REGISTRY_RESERVED_SCOPE_PREFIX = '@fuse';

const MODULE_PUBLIC_REGISTRY = 'public';

const RUNAS_ISSUER = 'runas-system-issuer';

// Changes to this variable will also require changing AgentTooltip.tsx in Portal.
const RUNAS_SYSTEM_ISSUER_SUFFIX = 'system.fusebit.io';

const JWT_PERMISSION_CLAIM = 'https://fusebit.io/permissions';

const RUNAS_KID_LEN = 8;

function get_log_table_name(deploymentKey: string): string {
  return `${deploymentKey}.log`;
}

function get_key_value_table_name(deploymentKey: string): string {
  return `${deploymentKey}.key-value`;
}

function get_subscription_table_name(deploymentKey: string): string {
  return `${deploymentKey}.subscription`;
}

function get_deployment_s3_bucket(deployment: any): string {
  return deployment.featureUseDnsS3Bucket
    ? `${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`
    : `fusebit-${deployment.deploymentName}-${deployment.region}`;
}

function get_module_prefix(
  prefix: string,
  runtime: string,
  name: string,
  moduleSpec: IModuleSpec | string,
  useVer: boolean,
  sep: string
) {
  const version = typeof moduleSpec === 'string' ? moduleSpec : moduleSpec.version;

  if (typeof moduleSpec === 'string' || moduleSpec.registry === MODULE_PUBLIC_REGISTRY) {
    // Old style module, assume it's global.
    return (useVer ? [prefix, runtime, name, version] : [prefix, runtime, name]).join(sep);
  }
  return (useVer
    ? [prefix, moduleSpec.registry, runtime, name, version]
    : [prefix, moduleSpec.registry, runtime, name]
  ).join(sep);
}

function get_module_metadata_key(runtime: string, name: string, moduleSpec: IModuleSpec | string) {
  return `${get_module_prefix(module_key_prefix, runtime, name, moduleSpec, true, '/')}/metadata.json`;
}

function get_module_key(runtime: string, name: string, moduleSpec: IModuleSpec) {
  return `${get_module_prefix(module_key_prefix, runtime, name, moduleSpec, true, '/')}/package.zip`;
}

function get_module_builder_description(ctx: any, name: string, moduleSpec: IModuleSpec) {
  return get_module_prefix(
    'module-builder',
    ctx.options.compute.runtime,
    [name, builderVersion].join(':'),
    moduleSpec,
    false,
    ':'
  );
}

function get_function_builder_description(options: any) {
  return `function-builder:${options.compute.runtime}:${builderVersion}`;
}

// Create a predictable fixed-length version of the lambda name, to avoid accidentally exceeding any name
// limits.
function get_function_builder_name(options: any) {
  return Crypto.createHash('sha1').update(get_function_builder_description(options)).digest('hex');
}

function get_module_builder_name(ctx: any, name: string) {
  return Crypto.createHash('sha1')
    .update(get_module_builder_description(ctx, name, ctx.options.internal.resolved_dependencies[name]))
    .digest('hex');
}

function get_user_function_build_status_key(options: any) {
  return `${function_build_status_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
}

function get_user_function_build_request_key(options: any) {
  return `${function_build_request_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
}

function get_user_function_build_key(options: any) {
  return `${function_build_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/package.zip`;
}

function get_user_function_spec_key(options: any) {
  return `${function_spec_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/spec.json`;
}

function get_user_function_description(options: any) {
  return `function:${options.subscriptionId}:${options.boundaryId}:${options.functionId}`;
}

function get_user_function_name(options: any, version?: string) {
  return (
    Crypto.createHash('sha1').update(get_user_function_description(options)).digest('hex') +
    (version !== undefined ? `:${version}` : '')
  );
}

function get_cron_key_prefix(options: any) {
  return `${cron_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/`;
}

function get_cron_key_suffix(options: any) {
  return Buffer.from(JSON.stringify([options.schedule.cron, options.schedule.timezone || 'UTC'])).toString('hex');
}

function get_cron_key(options: any) {
  return `${get_cron_key_prefix(options)}${get_cron_key_suffix(options)}`;
}

function get_function_location(req: any, subscriptionId: string, boundaryId: string, functionId: string) {
  return `${get_fusebit_endpoint(req)}/v1${get_function_path(subscriptionId, boundaryId, functionId)}`;
}

function get_fusebit_endpoint(req: any) {
  if (req.headers && req.headers['x-forwarded-proto'] && req.headers.host) {
    return `${req.headers['x-forwarded-proto'].split(',')[0]}://${req.headers.host}`;
  }

  if (req.protocol && req.headers && req.headers.host) {
    return `${req.protocol}://${req.headers.host}`;
  }
  return API_PUBLIC_ENDPOINT;
}

function get_function_path(subscriptionId: string, boundaryId: string, functionId: string) {
  return `/run/${subscriptionId}/${boundaryId}/${functionId}`;
}

const get_compute_tag_key = (key: string) => `compute.${key}`;
const get_dependency_tag_key = (key: string) => `dependency.${key}`;
const get_versions_tag_key = (key: string) => `environment.${key}`;
const get_metadata_tag_key = (key: string) => `tag.${key}`;
const get_template_tag_key = (key: string) => `template.${key}`;
const get_fusebit_tag_key = (key: string) => `fusebit.${key}`;
const get_security_tag_key = (key: string) => `security.${key}`;

function isSystemIssuer(issuerId: string) {
  return issuerId.match(`${RUNAS_SYSTEM_ISSUER_SUFFIX}$`);
}

function makeSystemIssuerId(kid: string) {
  return `${kid}.${RUNAS_SYSTEM_ISSUER_SUFFIX}`;
}

function makeFunctionSub(params: any, mode: string) {
  return ['uri', 'function', params.accountId, params.subscriptionId, params.boundaryId, params.functionId, mode].join(
    ':'
  );
}

const getFunctionPermissions = (summary: any): any => {
  return summary[get_security_tag_key('permissions')];
};

const getFunctionVersion = (summary: any): any => {
  return summary[get_versions_tag_key('function')];
};

const getFunctionAuthorization = (summary: any): any => {
  return summary[get_security_tag_key('authorization')];
};

const getFunctionAuthentication = (summary: any): any => {
  return summary[get_security_tag_key('authentication')];
};

export {
  get_log_table_name,
  get_key_value_table_name,
  get_subscription_table_name,
  valid_boundary_name,
  valid_function_name,
  function_build_status_key_prefix,
  function_build_request_key_prefix,
  function_build_key_prefix,
  function_spec_key_prefix,
  cron_key_prefix,
  module_key_prefix,
  get_module_metadata_key,
  get_module_key,
  get_user_function_build_status_key,
  get_user_function_build_request_key,
  get_user_function_build_key,
  get_user_function_spec_key,
  get_user_function_description,
  get_user_function_name,
  get_function_builder_description,
  get_module_builder_description,
  get_function_builder_name,
  get_module_builder_name,
  get_cron_key_prefix,
  get_cron_key_suffix,
  get_cron_key,
  get_function_location,
  get_function_path,
  get_fusebit_endpoint,
  get_deployment_s3_bucket,
  get_compute_tag_key,
  get_dependency_tag_key,
  get_versions_tag_key,
  get_metadata_tag_key,
  get_template_tag_key,
  get_fusebit_tag_key,
  get_security_tag_key,
  Permissions,
  RestrictedPermissions,
  UserPermissions,
  isSpecialized,
  isSystemIssuer,
  makeSystemIssuerId,
  makeFunctionSub,
  getFunctionPermissions,
  getFunctionVersion,
  getFunctionAuthorization,
  getFunctionAuthentication,
  REGISTRY_CATEGORY,
  REGISTRY_CATEGORY_CONFIG,
  REGISTRY_DEFAULT,
  REGISTRY_GLOBAL,
  MODULE_PUBLIC_REGISTRY,
  RUNAS_ISSUER,
  RUNAS_KID_LEN,
  JWT_PERMISSION_CLAIM,
  REGISTRY_RESERVED_SCOPE_PREFIX,
  RUNAS_SYSTEM_ISSUER_SUFFIX,
  API_PUBLIC_ENDPOINT,
  dynamoScanTable,
  expBackoff,
  asyncPool,
  duplicate,
  IModuleSpec,
  safePath,
  safePathMap,
};
