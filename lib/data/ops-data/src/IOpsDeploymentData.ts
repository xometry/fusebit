import { IDataSource } from '@5qtrs/data';
import {
  IFusebitSubscription,
  IFusebitAccount,
  IInitAdmin,
  IFusebitSubscriptionFlags,
} from './IFusebitSubscriptionData';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDeployment {
  deploymentName: string;
  region: string;
  networkName: string;
  domainName: string;
  size: number;
  elasticSearch: string;
  fuseopsVersion: string;
  dataWarehouseEnabled: boolean;
  featureUseDnsS3Bucket: boolean;
}

export interface IOpsDeploymentParameters {
  deploymentName: string;
  region: string;
  networkName: string;
  domainName: string;
  size?: number;
  elasticSearch?: string;
  dataWarehouseEnabled?: boolean;
  featureUseDnsS3Bucket: boolean;
}
export interface IListOpsDeploymentOptions {
  deploymentName?: string;
  next?: string;
  limit?: number;
  flags?: IFusebitSubscriptionFlags;
}

export interface IListOpsDeploymentResult {
  next?: string;
  items: IOpsDeployment[];
}

export interface IOpsDeploymentData extends IDataSource {
  existsAndUpdate(deployment: IOpsDeploymentParameters): Promise<boolean>;
  add(deployment: IOpsDeployment): Promise<void>;
  addSubscription(subscription: IFusebitSubscription): Promise<void>;
  limitSubscription(account: string, subscription: IFusebitSubscription): Promise<void>;
  setFlags(account: string, subscription: IFusebitSubscription): Promise<void>;
  setDefaults(deployment: IOpsDeployment, defaultKey: string, defaults: any): Promise<void>;
  unsetDefaults(deployment: IOpsDeployment, defaultKey: string, dotKey: string): Promise<void>;
  getDefaults(deployment: IOpsDeployment, defaultKey: string): Promise<any>;
  get(deploymentName: string, region: string): Promise<IOpsDeployment>;
  list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult>;
  listAll(deploymentName?: string): Promise<IOpsDeployment[]>;
  listAllSubscriptions(deployment: IOpsDeployment): Promise<IFusebitAccount[]>;
  initAdmin(deployment: IOpsDeployment, init: IInitAdmin): Promise<IInitAdmin>;
  getElasticSearchTemplate(deployment: IOpsDeployment): Promise<string>;
}
