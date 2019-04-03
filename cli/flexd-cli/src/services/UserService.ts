import { Message, IExecuteInput, Confirm, MessageKind } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';
import { request } from '@5qtrs/request';
import { clone } from '@5qtrs/clone';
import { toBase64 } from '@5qtrs/base64';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

// -------------------
// Exported Interfaces
// -------------------

export interface IFlexdIdentitiy {
  iss: string;
  sub: string;
}

export interface IFlexdAccess {
  action: string;
  resource: string;
}

export interface INewFlexdUser {
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
}

export interface IAddUserAccess {
  action: string;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFlexdUpdateUser extends INewFlexdUser {
  identities?: IFlexdIdentitiy[];
  access?: {
    allow?: IFlexdAccess[];
  };
}

export interface IFlexdUser extends IFlexdUpdateUser {
  id: string;
}

export interface IFlexdInitResolve {
  displayName: string;
  publicKey: string;
  keyId: string;
  iss: string;
  sub: string;
}

// ----------------
// Exported Classes
// ----------------

export class UserService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new UserService(profileService, executeService, input);
  }

  public async listUsers(): Promise<IFlexdUser[] | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const result = await this.executeService.executeRequest(
      {
        header: 'Get Users',
        message: Text.create("Getting the users of account '", Text.bold(profile.account || ''), "'..."),
        errorHeader: 'Get User Error',
        errorMessage: Text.create("Unable to get the users of account '", Text.bold(profile.account || ''), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user`,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );

    return result ? result.items : undefined;
  }

  public async getUser(id: string): Promise<IFlexdUser | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const user = await this.executeService.executeRequest(
      {
        header: 'Get User',
        message: Text.create("Getting user '", Text.bold(id), "'..."),
        errorHeader: 'Get User Error',
        errorMessage: Text.create("Unable to get user '", Text.bold(id), "'"),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );

    return user;
  }

  public async addUser(id: string, newUser: INewFlexdUser): Promise<IFlexdUser | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const user = await this.executeService.executeRequest(
      {
        header: 'Add User',
        message: Text.create('Adding the user...'),
        errorHeader: 'Add User Error',
        errorMessage: Text.create('Unable to add the user'),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user`,
        data: newUser,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );
    return user;
  }

  public async confirmAddUser(newUser: INewFlexdUser): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Add User?',
      message: Text.create('Add the new user shown below?'),
      details: this.getUserConfirmDetails(profile.account as string, newUser),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Add User Canceled',
        message: Text.create('Adding the new user was canceled.'),
        kind: MessageKind.warning,
      });
    }

    return confirmed;
  }

  public async removeUser(id: string): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const success = await this.executeService.executeRequest(
      {
        header: 'Remove User',
        message: Text.create("Removing user '", Text.bold(id), "'..."),
        errorHeader: 'Remove User Error',
        errorMessage: Text.create("Unable to remove user '", Text.bold(id), "'"),
      },
      {
        method: 'DELETE',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}`,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );

    return success === true;
  }

  public async confirmRemoveUser(id: string, user: IFlexdUser): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Remove User?',
      message: Text.create("Remove user '", Text.bold(id), "' shown below?"),
      details: this.getUserConfirmDetails(profile.account as string, user),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Remove User Canceled',
        message: Text.create("Removing user '", Text.bold(id), "' was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async updateUser(user: IFlexdUser): Promise<IFlexdUser | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const userSansId = clone(user);
    userSansId.id = undefined;
    const updatedUser = await this.executeService.executeRequest(
      {
        header: 'Update User',
        message: Text.create("Updating user '", Text.bold(user.id), "'..."),
        errorHeader: 'Update User Error',
        errorMessage: Text.create("Unable to update user '", Text.bold(user.id), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${user.id}`,
        data: userSansId,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );

    return updatedUser;
  }

  public async initUser(id: string): Promise<string | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const initEntry = await this.executeService.executeRequest(
      {
        header: 'Generate Token',
        message: Text.create("Generating an init token for user '", Text.bold(id), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to generate an init token for user '", Text.bold(id), "'"),
      },
      {
        method: 'POST',
        url: `${profile.baseUrl}/v1/account/${profile.account}/user/${id}/init`,
        headers: { Authorization: `bearer ${profile.token}` },
      }
    );

    const initId = initEntry.initId;
    const token = toBase64([profile.baseUrl, profile.account, id, initId].join('::'));
    return token;
  }

  public async confirmInitUser(user: IFlexdUser): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Generate Init Token?',
      message: Text.create("Generate an init token for user '", Text.bold(user.id), "'?"),
      details: this.getUserConfirmDetails(profile.account as string, user),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Init Token Canceled',
        message: Text.create("Generating an init token for user '", Text.bold(user.id), "' was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async resolveInitId(
    accountId: string,
    agentId: string,
    initId: string,
    initResolve: IFlexdInitResolve
  ): Promise<IFlexdUser | undefined> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return undefined;
    }

    const user = await this.executeService.executeRequest(
      {
        header: 'Verifying Token',
        message: Text.create("Verifying the init token for user '", Text.bold(agentId), "'..."),
        errorHeader: 'Token Error',
        errorMessage: Text.create("Unable to verify the init token for user '", Text.bold(agentId), "'"),
      },
      {
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${accountId}/user/${agentId}/init/${initId}`,
        data: initResolve,
      }
    );

    return user;
  }

  public async confirmAddUserAccess(user: IFlexdUser, access: IAddUserAccess): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Add User Access?',
      message: Text.create("Add the access shown below to user '", Text.bold(user.id), "'?"),
      details: this.getUserAccessConfirmDetails(profile.account as string, user, access),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Add User Access Canceled',
        message: Text.create("Adding access to user '", Text.bold(user.id), "' was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async confirmAddUserIdentity(user: IFlexdUser, identity: IFlexdIdentitiy): Promise<boolean> {
    const profile = await this.profileService.getExecutionProfile(['account']);
    if (!profile) {
      return false;
    }

    const confirmPrompt = await Confirm.create({
      header: 'Add User Identity?',
      message: Text.create("Add the identity shown below to user '", Text.bold(user.id), "'?"),
      details: this.getUserIdentityConfirmDetails(profile.account as string, user, identity),
    });
    const confirmed = await confirmPrompt.prompt(this.input.io);
    if (!confirmed) {
      await this.executeService.result({
        header: 'Add User Identity Canceled',
        message: Text.create("Adding the identity to user '", Text.bold(user.id), "' was canceled."),
        kind: MessageKind.warning,
      });
    }
    return confirmed;
  }

  public async displayUsers(users: IFlexdUser[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(users, null, 2));
      return;
    }

    const message = await Message.create({
      header: Text.blue('Users'),
      message: Text.blue('Details'),
    });
    await message.write(this.input.io);

    for (const user of users) {
      await this.writeUser(user);
    }
  }

  public async displayUser(user: IFlexdUser) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(user, null, 2));
      return;
    }

    await this.writeUser(user);
  }

  public async displayInitToken(initToken: string) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(initToken, null, 2));
      return;
    }
    await this.executeService.result({
      header: 'Init Token',
      message: Text.create(
        'Provide the following init token to the user. ',
        'It is a single use token that will expire in 8 hours.',
        Text.eol(),
        Text.eol(),
        'Have the user execute the following command:'
      ),
      kind: MessageKind.result,
    });
    console.log(`flx init ${initToken}`);
    console.log();
  }

  private async writeUser(user: IFlexdUser) {
    const details = [Text.dim('Id: '), user.id || ''];

    if (user.primaryEmail) {
      details.push(Text.eol());
      details.push(Text.dim('Email: '));
      details.push(user.primaryEmail);
    }

    if (user.identities && user.identities.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Identities: '));
      for (const identity of user.identities) {
        details.push(...[Text.eol(), Text.dim('• iss: '), identity.iss, Text.eol(), Text.dim('  sub: '), identity.sub]);
      }
    }

    if (user.access && user.access.allow && user.access.allow.length) {
      details.push(...[Text.eol(), Text.eol()]);
      details.push(Text.italic('Allow: '));
      for (const access of user.access.allow) {
        details.push(
          ...[Text.eol(), Text.dim('• action: '), access.action, Text.eol(), Text.dim('  resource:'), access.resource]
        );
      }
    }

    let userCount = 1;
    const userName =
      user.firstName || user.lastName ? [user.firstName, user.lastName].join(' ') : `User ${userCount++}`;

    const message = await Message.create({
      header: Text.bold(userName),
      message: Text.create(details),
    });
    await message.write(this.input.io);
  }

  private getUserConfirmDetails(account: string, user: INewFlexdUser) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
    ];

    return details;
  }

  private getUserAccessConfirmDetails(account: string, user: IFlexdUser, access: IAddUserAccess) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Action', value: access.action },
    ];

    if (access.account) {
      details.push({ name: 'Account', value: access.account });
    }
    if (access.subscription) {
      details.push({ name: 'Subscription', value: access.subscription });
    }
    if (access.boundary) {
      details.push({ name: 'Boundary', value: access.boundary });
    }
    if (access.function) {
      details.push({ name: 'Function', value: access.function });
    }

    return details;
  }

  private getUserIdentityConfirmDetails(account: string, user: IFlexdUser, identity: IFlexdIdentitiy) {
    const details = [
      { name: 'Account', value: account },
      { name: 'First Name', value: user.firstName || notSet },
      { name: 'Last Name', value: user.lastName || notSet },
      { name: 'Email', value: user.primaryEmail || notSet },
      { name: Text.dim('•'), value: Text.dim('•') },
      { name: 'Issuer', value: identity.iss },
      { name: 'Subject', value: identity.sub },
    ];

    return details;
  }
}