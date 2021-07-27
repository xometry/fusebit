import { ServerResponse } from 'http';
import * as Superagent from 'superagent';
import { EditorContext, BaseEditorContext } from './EditorContext';
import { FunctionEditorContext } from './FunctionEditorContext';

import * as Options from './Options';
import { ICreateEditorOptions } from './CreateEditor';
import { IFunctionSpecification } from './FunctionSpecification';

import { IError } from './Events';
const Superagent1 = Superagent;

import { BaseServer, AccountResolver, IBuildStatus, userAgent, BuildError, IAccount } from './Server';

export class FunctionServer extends BaseServer<IFunctionSpecification> {
  /**
   * Creates an instance of the _FunctionServer_ using static Fusebit HTTP API credentials. This is used in
   * situations where the access token is known ahead of time and will not change during the user's session
   * with the editor.
   * @param account Static credentials to the Fusebit HTTP APIs.
   */
  public static create(account: IAccount): BaseServer<IFunctionSpecification> {
    return new FunctionServer((currentAccount) => Promise.resolve(account));
  }

  /**
   * Creates an instance of the _Server_ using a dynamic [[AsyncResolver]] callback to resolve credentials.
   * This is used in situations where the access token is expected to change and must be refreshed during
   * the lifetime of the end user's interaction with the editor, for example due to expiry.
   * @param accountResolver The callback _Server_ will invoke before every Fusebit HTTP API call to ensure it
   * has fresh credentials.
   */
  constructor(public accountResolver: AccountResolver) {
    super(accountResolver);
  }

  public getFunctionUrl(boundaryId: string, id: string): Promise<string> {
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${boundaryId}/function/${id}/location`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then((res) => {
        return res.body.location;
      });
  }

  public loadEditorContext(
    boundaryId: string,
    id: string,
    createIfNotExist?: ICreateEditorOptions
  ): Promise<BaseEditorContext<IFunctionSpecification>> {
    const self = this;
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${boundaryId}/function/${id}?include=all`;
        return Superagent.get(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout);
      })
      .then((res) => {
        const editorContext = createEditorContext(res.body);
        return editorContext;
      })
      .catch((error) => {
        if (!createIfNotExist) {
          throw new Error(
            `Fusebit editor failed to load function ${boundaryId}/${id} because it does not exist, and IEditorCreationOptions were not specified. Specify IEditorCreationOptions to allow a function to be created if one does not exist.`
          );
        }
        const editorContext = createEditorContext(createIfNotExist.template);
        if (createIfNotExist.editor && createIfNotExist.editor.ensureFunctionExists) {
          return this.buildFunction(editorContext).then((_) => editorContext);
        } else {
          editorContext.setDirtyState(true);
          return editorContext;
        }
      });

    function createEditorContext(functionSpecification?: IFunctionSpecification) {
      const defaultEditorOptions = new Options.EditorOptions();
      const editorOptions = {
        ...defaultEditorOptions,
        ...(createIfNotExist && createIfNotExist.editor),
        version: require('../package.json').version,
      };
      Object.keys(defaultEditorOptions).forEach((k) => {
        // @ts-ignore
        if (editorOptions[k] !== false && typeof editorOptions[k] !== 'string') {
          // @ts-ignore
          editorOptions[k] = {
            ...defaultEditorOptions[k],
            // @ts-ignore
            ...editorOptions[k],
            theme: editorOptions.theme,
          };
        }
      });
      const editorContext = new FunctionEditorContext(self, boundaryId, id, functionSpecification);
      if ((createIfNotExist && createIfNotExist.editor) || !editorContext._ensureFusebitMetadata().editor) {
        editorContext._ensureFusebitMetadata(true).editor = editorOptions;
      }
      return editorContext;
    }
  }

  public buildFunction(editorContext: EditorContext): Promise<IBuildStatus> {
    let startTime: number;
    let self = this;

    const waitForBuild = (build: IBuildStatus): Promise<IBuildStatus> => {
      const elapsed = Date.now() - startTime;
      build.progress = Math.min(elapsed / this.buildTimeout, 1);
      editorContext.buildProgress(build);
      if (elapsed > this.buildTimeout) {
        throw new Error(`Build process did not complete within the ${this.buildTimeout}ms timeout.`);
      }
      return new Promise((resolve) => setTimeout(resolve, this.buildStatusCheckInterval))
        .then(() => {
          // @ts-ignore
          const url = `${this.account.baseUrl}v1/account/${self.account.accountId}/subscription/${
            // @ts-ignore
            self.account.subscriptionId
          }/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/build/${build.buildId}`;
          return (
            Superagent.get(url)
              // @ts-ignore
              .set('Authorization', `Bearer ${self.account.accessToken}`)
              .set('x-user-agent', userAgent)
              .ok((res) => true)
              .timeout(this.requestTimeout)
          );
        })
        .then((res) => {
          if (res.status === 200) {
            // success
            editorContext.buildFinished(res.body);
            return res.body;
          } else if (res.status === 201) {
            // wait some more
            return waitForBuild(res.body);
          } else {
            // failure
            editorContext.buildError((res.body.error || res.body) as IError);
            throw new BuildError(res.body.error || res.body);
          }
        });
    };

    editorContext.startBuild();

    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        const url = `${this.account.baseUrl}v1/account/${this.account.accountId}/subscription/${this.account.subscriptionId}/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}`;
        startTime = Date.now();
        let params: any = {
          environment: 'nodejs',
          provider: 'lambda',
          configurationSerialized: editorContext.getConfigurationSettings(),
          computeSerialized: editorContext.getComputeSettings(),
          scheduleSerialized: editorContext.getScheduleSettings(),
          nodejs: editorContext.getSpecification().nodejs,
          metadata: editorContext.getSpecification().metadata,
          security: editorContext.getSpecification().security,
        };
        return Superagent.put(url)
          .set('Authorization', `Bearer ${this.account.accessToken}`)
          .set('x-user-agent', userAgent)
          .timeout(this.requestTimeout)
          .ok((res) => true)
          .send(params);
      })
      .then((res) => {
        let build = res.body as IBuildStatus;
        if (res.status === 204) {
          // No changes
          build = {
            status: 'unchanged',
            subscriptionId: (this.account as IAccount).subscriptionId,
            boundaryId: editorContext.boundaryId,
            functionId: editorContext.functionId,
          };
          editorContext.buildFinished(build);
          return build;
        } else if (res.status === 200) {
          // Completed synchronously
          editorContext.buildFinished(build);
          return build;
        } else if (res.status === 201) {
          return waitForBuild(build);
        } else {
          editorContext.buildError((res.body.error || res.body) as IError);
          throw new BuildError(build);
        }
      })
      .catch((err) => {
        if (!(err instanceof BuildError)) {
          editorContext.buildError(err);
        }
        throw err;
      });
  }

  public runFunction(editorContext: EditorContext): Promise<ServerResponse> {
    return this.accountResolver(this.account)
      .then((newAccount) => {
        this.account = this._normalizeAccount(newAccount);
        if (editorContext.location) {
          return editorContext.location;
        } else {
          return this.getFunctionUrl(editorContext.boundaryId, editorContext.functionId);
        }
      })
      .then((url) => {
        editorContext.location = url;
        editorContext.startRun(url);

        function runnerFactory(ctx: object) {
          const Superagent = Superagent1; // tslint:disable-line
          return eval(editorContext.getRunnerContent())(ctx); // tslint:disable-line
        }

        const runnerPromise = runnerFactory({
          url,
          configuration: editorContext.getConfiguration(),
        });

        return runnerPromise;
      })
      .catch((error) => {
        editorContext.finishRun(error);
        throw error;
      })
      .then((res) => {
        editorContext.finishRun(undefined, res);
        return res;
      });
  }

  public getServerLogUrl = (account: IAccount, editorContext: EditorContext): string => {
    return `${account.baseUrl}v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${editorContext.boundaryId}/function/${editorContext.functionId}/log?token=${account.accessToken}`;
  };
}