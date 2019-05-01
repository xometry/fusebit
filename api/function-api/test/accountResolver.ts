import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

export interface IAccount {
  accountId: string;
  subscriptionId: string;
  baseUrl: string;
  accessToken: string;
}

export const FakeAccount: IAccount = {
  accountId: 'NA',
  subscriptionId: 'NA',
  baseUrl: 'NA',
  accessToken: 'NA',
};

export async function resolveAccount(): Promise<IAccount> {
  if (process.env.FUSE_PROFILE) {
    let profile = await FusebitProfile.create();
    let executionProfile = await profile.getExecutionProfile(process.env.FUSE_PROFILE, true);
    return {
      accountId: executionProfile.account as string,
      subscriptionId: 'sub-0000000000000000',
      baseUrl: executionProfile.baseUrl,
      accessToken: executionProfile.accessToken,
    };
  } else {
    throw new Error('You must provide FUSE_PROFILE environment variable to choose the deployment to test.');
  }
}