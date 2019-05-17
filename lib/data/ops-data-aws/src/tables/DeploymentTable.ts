import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'deployment',
  attributes: { deploymentName: 'S', region: 'S' },
  keys: ['deploymentName', 'region'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(key: { deploymentName: string; region: string }) {
  return {
    deploymentName: { S: key.deploymentName },
    region: { S: key.region },
  };
}

function toItem(deployment: IOpsDeployment) {
  const item: any = toKey(deployment);
  item.networkName = { S: deployment.networkName };
  item.domainName = { S: deployment.domainName };
  item.size = { N: deployment.size.toString() };
  item.dataWarehouseEnabled = { BOOL: deployment.dataWarehouseEnabled };
  return item;
}

function fromItem(item: any): IOpsDeployment {
  return {
    deploymentName: item.deploymentName.S,
    region: item.region.S,
    networkName: item.networkName.S,
    domainName: item.domainName.S,
    size: parseInt(item.size.N, 10),
    dataWarehouseEnabled: item.dataWarehouseEnabled.BOOL,
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.accountDefaultLimit,
    maxLimit: config.accountMaxLimit,
  });
}

function onDeploymentAlreadyExists(deployment: IOpsDeployment) {
  throw OpsDataException.deploymentAlreadyExists(deployment.deploymentName);
}

function onDeploymentDoesNotExist(deploymentName: string) {
  throw OpsDataException.noDeployment(deploymentName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDeployment {
  deploymentName: string;
  region: string;
  networkName: string;
  domainName: string;
  size: number;
  dataWarehouseEnabled: boolean;
}

export interface IListOpsDeploymentOptions {
  deploymentName?: string;
  next?: string;
  limit?: number;
}

export interface IListOpsDeploymentResult {
  next?: string;
  items: IOpsDeployment[];
}

// ----------------
// Exported Classes
// ----------------

export class DeploymentTable extends AwsDynamoTable {
  private config: OpsDataAwsConfig;

  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new DeploymentTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(deployment: IOpsDeployment): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentAlreadyExists };
    return this.addItem(deployment, options);
  }

  public async get(deploymentName: string, region: string): Promise<IOpsDeployment> {
    const options = { onNotFound: onDeploymentDoesNotExist };
    return this.getItem({ deploymentName, region }, options);
  }

  public async list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
    if (options && options.deploymentName) {
      const queryOptions = {
        limit: options && options.limit ? options.limit : undefined,
        next: options && options.next ? options.next : undefined,
        expressionValues: { ':deploymentName': { S: options.deploymentName } },
        keyConditions: ['deploymentName = :deploymentName'],
      };
      return this.queryTable(queryOptions);
    }
    return this.scanTable(options);
  }

  public async listAll(deploymentName?: string): Promise<IOpsDeployment[]> {
    const deployments = [];
    const options: IListOpsDeploymentOptions = { limit: this.config.accountMaxLimit, deploymentName };
    do {
      const result = await this.list(options);
      deployments.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return deployments;
  }

  public async delete(deploymentName: string, region: string): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentDoesNotExist };
    await this.deleteItem({ deploymentName, region }, options);
  }
}
