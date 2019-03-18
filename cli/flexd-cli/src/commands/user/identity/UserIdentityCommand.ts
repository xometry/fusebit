import { EOL } from 'os';
import { Command, ICommand } from '@5qtrs/cli';
import { UserIdentityAddCommand } from './UserIdentityAddCommand';
import { UserIdentityRemoveCommand } from './UserIdentityRemoveCommand';

// ------------------
// Internal Constants
// ------------------

const command: ICommand = {
  name: 'User Identity',
  cmd: 'identity',
  summary: 'Manage user identities',
  description: [
    `Add or remove identities associated with a user.${EOL}${EOL}A`,
    "user identity is a set of 'iss' (issuer) and 'sub' (subject) claims in an access",
    `token that identify the user.${EOL}${EOL}A profile must have 'manage' access to`,
    'an account or a subscription in that account in order to add or remove the',
    'identities of users.',
  ].join(' '),
};

// ------------------
// Internal Functions
// ------------------

async function getSubCommands() {
  const subCommands = [];
  subCommands.push(await UserIdentityAddCommand.create());
  subCommands.push(await UserIdentityRemoveCommand.create());
  return subCommands;
}

// ----------------
// Exported Classes
// ----------------

export class UserIdentityCommand extends Command {
  private constructor(command: ICommand) {
    super(command);
  }

  public static async create() {
    command.subCommands = await getSubCommands();
    return new UserIdentityCommand(command);
  }
}
