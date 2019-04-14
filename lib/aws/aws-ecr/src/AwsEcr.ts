import { AwsBase, IAwsOptions } from '@5qtrs/aws-base';
import { spawn } from '@5qtrs/child-process';
import { fromBase64 } from '@5qtrs/base64';
import { ECR } from 'aws-sdk';

// ------------------
// Internal Functions
// ------------------

function mapToRepo(item: any) {
  return {
    arn: item.repositoryArn,
    id: item.repositoryId,
    name: item.repositoryName,
    url: item.repositoryUri,
  };
}

// -------------------
// Exported Interfaces
// -------------------

interface IAwsRepository {
  arn: string;
  id: string;
  name: string;
  url: string;
}

// ----------------
// Exported Classes
// ----------------

export class AwsEcr extends AwsBase<typeof ECR> {
  public static async create(options: IAwsOptions) {
    return new AwsEcr(options);
  }
  private constructor(options: IAwsOptions) {
    super(options);
  }

  protected onGetAws(options: any) {
    return new ECR(options);
  }

  public async pushImage(repository: string, tag: string) {
    const repo = await this.getRepository(repository);
    if (!repo) {
      const message = `No such ECR '${repository}' repository`;
      throw new Error(message);
    }

    const accountId = this.options.deployment.account;
    const region = this.options.deployment.region.code;
    const auth = await this.getAuth();
    const decoded = fromBase64(auth.token);
    const token = decoded.substring(4);
    const command = [
      `docker login -u AWS -p ${token} ${auth.loginUrl} &&`,
      `docker tag ${repository}:${tag} ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag} &&`,
      `docker push ${accountId}.dkr.ecr.${region}.amazonaws.com/${repository}:${tag}`,
    ].join(' ');

    const result = await spawn(command, { shell: true });
    if (result.code !== 0) {
      const message = `Docker login and push failed with output: ${result.stderr.toString()}`;
      throw new Error(message);
    }

    // const result1 = await spawn('docker', {
    //   args: ['tag', 'test:latest', '321612923577.dkr.ecr.us-east-2.amazonaws.com/test:latest'],
    // });
    // const result = await spawn('docker', { args: ['push', image] });
    // console.log(result.code);
    // console.log(result.stderr.toString());
    // console.log(result.stdout.toString());
    // if (result.code !== 0) {
    //   const message = `Docker push failed with output: ${result.stdout}`;
    //   throw new Error(message);
    // }
  }

  public async createRepository(name: string): Promise<IAwsRepository> {
    const ecr = await this.getAws();

    const params = {
      repositoryName: name,
    };

    return new Promise((resolve, reject) => {
      ecr.createRepository(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const repo = data.repository ? mapToRepo(data.repository) : undefined;
        resolve(repo);
      });
    });
  }

  public async getRepository(name: string): Promise<IAwsRepository | undefined> {
    const ecr = await this.getAws();

    const params = {
      repositoryNames: [name],
    };

    return new Promise((resolve, reject) => {
      ecr.describeRepositories(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }

        const repo = data.repositories && data.repositories.length ? mapToRepo(data.repositories[0]) : undefined;
        resolve(repo);
      });
    });
  }

  private async getAuth(): Promise<any> {
    const ecr = await this.getAws();

    return new Promise((resolve, reject) => {
      ecr.getAuthorizationToken({}, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        const auth = {
          token: data.authorizationData[0].authorizationToken,
          loginUrl: data.authorizationData[0].proxyEndpoint,
        };
        resolve(auth);
      });
    });
  }
}