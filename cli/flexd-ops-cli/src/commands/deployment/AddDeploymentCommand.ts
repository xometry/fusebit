import { Command, IExecuteInput, Confirm, ArgType } from '@5qtrs/cli';
import { FlexdOpsCore, IFlexdOpsPublishDetails, IFlexdOpsDeployment } from '@5qtrs/flexd-ops-core';
import { ExecuteService, ApiPublishService, DisplayService, SettingsService, ApiSetupService } from '../../services';
import { Text } from '@5qtrs/text';

// ----------------
// Exported Classes
// ----------------

export class AddDeploymentCommand extends Command {
  private core: FlexdOpsCore;

  public static async create(core: FlexdOpsCore) {
    return new AddDeploymentCommand(core);
  }

  private constructor(core: FlexdOpsCore) {
    super({
      name: 'Deployment',
      cmd: 'add',
      summary: 'Add a deployment',
      description: 'Adds a new deployment to the Flexd platform.',
      arguments: [
        {
          name: 'name',
          description: 'The name of the new deployment',
        },
        {
          name: 'network',
          description: 'The network to add the deployment to',
        },
        {
          name: 'domain',
          description: 'The domain where the deployment should be hosted',
        },
        {
          name: 'image',
          description: "The image to deploy in the form of '{repo}:{tag}'",
        },
      ],
      options: [
        {
          name: 'comment',
          aliases: ['c'],
          description: 'A comment to include with the code',
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: 'If set to true, prompts for confirmation before adding the deployment to the Flexd platform',
          type: ArgType.boolean,
          default: 'true',
        },
      ],
    });
    this.core = core;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, network, domain, image] = input.arguments as string[];
    const comment = input.options.comment as string;
    const deployment: IFlexdOpsDeployment = { name, network, domain, comment, image };

    const executeService = await ExecuteService.create(this.core, input);
    const settingsService = await SettingsService.create(this.core, input);
    const publishService = await ApiPublishService.create(this.core, input);
    const setupService = await ApiSetupService.create(this.core, input);

    const deploymentExists = await executeService.execute(
      {
        header: 'Deployment Check',
        message: Text.create("Determining if the '", Text.bold(name), "' deployment already exists... "),
        errorHeader: 'Check Error',
        errorMessage: Text.create(
          "An error was encountered when trying to determine if the '",
          Text.bold(name),
          "' deployment already exists. "
        ),
      },
      async () => this.core.deploymentExists(deployment)
    );

    if (deploymentExists === undefined) {
      return 1;
    }

    if (deploymentExists) {
      await executeService.execute({
        header: 'Already Exists',
        message: Text.create("The '", Text.bold(name), "' deployment already exists. "),
      });
      return 0;
    }

    const user = await settingsService.getUser();
    if (!user) {
      return 1;
    }

    deployment.createdBy = user;

    const apis = await this.core.listApis();
    const publishcomment = `Build for new '${name}' deployment`;

    const publishedApis: IFlexdOpsPublishDetails[] = [];
    for (const api of apis) {
      const publishedApi = await publishService.publishApi(api, user, publishcomment);
      if (!publishedApi) {
        return 1;
      }

      publishedApis.push(publishedApi);
    }

    const addedDeployment = await executeService.execute(
      {
        header: 'Adding the Deployment',
        message: Text.create('Adding the deployment to the Flexd platform... '),
        errorHeader: 'Check Error',
        errorMessage: Text.create('An error was encountered when trying to add the deployment to the Flexd platform. '),
      },
      async () => this.core.addDeployment(deployment, publishedApis)
    );

    if (!addedDeployment) {
      return 1;
    }

    for (const publishedApi of publishedApis) {
      const setupOk = await setupService.setupApi(addedDeployment, publishedApi);
      if (!setupOk) {
        return 1;
      }
    }

    const instanceLaunched = await executeService.execute(
      {
        header: 'Launching Instance',
        message: Text.create('Launching the Flexd service instance... '),
        errorHeader: 'Check Error',
        errorMessage: Text.create('An error was encountered when trying to launch the Flexd service instance. '),
      },
      async () => {
        await this.core.deployInstance(deployment.name, image);
        return true;
      }
    );
    if (!instanceLaunched) {
      return 1;
    }

    const certExists = await executeService.execute(
      {
        header: 'Certificate Check',
        message: Text.create('Determining if the certificate for the deployment already exists... '),
        errorHeader: 'Check Error',
        errorMessage: Text.create(
          'An error was encountered when trying to determine if the certificate for the deployment already exists. '
        ),
      },
      async () => this.core.certExists(deployment)
    );

    if (certExists === undefined) {
      return 1;
    }

    if (!certExists) {
      const certIssued = await executeService.execute(
        {
          header: 'Issuing Certificate',
          message: Text.create('Issuing a certificate for the deployment... '),
          errorHeader: 'Check Error',
          errorMessage: Text.create('An error was encountered when trying to issue a certificate for the deployment. '),
        },
        async () => {
          await this.core.issueCert(deployment);
          return true;
        }
      );
      if (!certIssued) {
        return 0;
      }
    }

    const albAdded = await executeService.execute(
      {
        header: 'Creating Load Balancer',
        message: Text.create('Creating a load balancer for the deployment... '),
        errorHeader: 'Load Balancer Error',
        errorMessage: Text.create(
          'An error was encountered when trying to create a load balancer for the deployment. '
        ),
      },
      async () => {
        await this.core.addDeploymentAlb(deployment);
        return true;
      }
    );
    if (!albAdded) {
      return 0;
    }

    return 0;
  }
}