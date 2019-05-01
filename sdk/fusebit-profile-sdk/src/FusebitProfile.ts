import { FusebitDotConfig } from './FusebitDotConfig';
import { createKeyPair } from '@5qtrs/key-pair';
import { signJwt } from '@5qtrs/jwt';
import { random } from '@5qtrs/random';
import { toBase64 } from '@5qtrs/base64';
import { FusebitProfileError } from './FusebitProfileError';

// ------------------
// Internal Constants
// ------------------

const expireInSeconds = 60 * 60 * 2;
const minExpireInterval = 1000 * 60 * 5;
const kidLength = 8;
const jwtAlgorithm = 'RS256';

// ------------------
// Internal Functions
// ------------------

function getKeyHash(profile: IFusebitProfile): string {
  return `${toBase64(profile.issuer as string)}:${toBase64(profile.subject as string)}:${toBase64(profile.baseUrl)}`;
}

function nomarlizeBaseUrl(baseUrl: string): string {
  baseUrl = baseUrl.toLowerCase();
  if (baseUrl[baseUrl.length - 1] === '/') {
    baseUrl = baseUrl.substring(0, baseUrl.length - 1);
  }
  if (baseUrl.indexOf('http') === -1) {
    throw FusebitProfileError.baseUrlMissingProtocol(baseUrl);
  }
  return baseUrl;
}

function getDomainFromBaseUrl(baseUrl: string): string {
  let domain = baseUrl.toLowerCase();
  domain = domain.replace('https://', '').replace('http://', '');
  const indexOfPort = domain.indexOf(':');
  if (indexOfPort !== -1) {
    domain = domain.substring(0, indexOfPort);
  }

  const indexOfForwardSlash = domain.indexOf('/');
  if (indexOfForwardSlash !== -1) {
    domain = domain.substring(0, indexOfForwardSlash);
  }

  return domain;
}

function getProfileNameFromBaseUrl(baseUrl: string) {
  const domain = getDomainFromBaseUrl(baseUrl);
  return domain.split('.')[0];
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitProfileSettings {
  [index: string]: string | undefined;
  account: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFusebitNewProfile extends IFusebitProfileSettings {
  agent: string;
  baseUrl: string;
  issuer: string;
  subject: string;
}

export interface IFusebitProfile extends IFusebitNewProfile {
  name: string;
  created: string;
  updated: string;
  keyPair: string;
  kid: string;
}

export interface IFusebitExecutionProfile extends IFusebitProfileSettings {
  accessToken: string;
  baseUrl: string;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitProfile {
  private dotConfig: FusebitDotConfig;

  private constructor(dotConfig: FusebitDotConfig) {
    this.dotConfig = dotConfig;
  }

  public static async create() {
    const dotConfig = await FusebitDotConfig.create();
    return new FusebitProfile(dotConfig);
  }

  public async profileExists(name: string): Promise<boolean> {
    return this.dotConfig.profileExists(name);
  }

  public async getProfileNameFromBaseUrl(baseUrl: string): Promise<string> {
    return getProfileNameFromBaseUrl(baseUrl);
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    return this.dotConfig.getDefaultProfileName();
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    await this.getProfileOrThrow(name);
    return this.dotConfig.setDefaultProfileName(name);
  }

  public async listProfiles(): Promise<IFusebitProfile[]> {
    const names = await this.dotConfig.listProfileNames();
    const profiles: IFusebitProfile[] = [];
    for (const name of names) {
      const profile = await this.getProfile(name);
      if (profile) {
        profile.name = name;
        profiles.push(profile);
      }
    }
    return profiles;
  }

  public async getProfile(name: string): Promise<IFusebitProfile | undefined> {
    const profile = (await this.dotConfig.getProfile(name)) as IFusebitProfile;
    if (profile) {
      profile.name = name;
    }
    return profile || undefined;
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitProfile> {
    const profile = await this.getProfile(name);
    if (profile === undefined) {
      throw FusebitProfileError.profileDoesNotExist(name);
    }
    return profile;
  }

  public async getProfileOrDefault(name?: string): Promise<IFusebitProfile | undefined> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        return undefined;
      }
    }
    return this.getProfile(name);
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitProfile> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        throw FusebitProfileError.noDefaultProfile();
      }
    }

    return this.getProfileOrThrow(name);
  }

  public async addProfile(name: string, toAdd: IFusebitNewProfile): Promise<IFusebitProfile> {
    const { publicKey, privateKey } = await createKeyPair();
    const kid = await this.generateKid(name);

    await this.dotConfig.setPrivateKey(name, kid, privateKey);
    await this.dotConfig.setPublicKey(name, kid, publicKey);

    const created = new Date().toLocaleDateString();

    const fullProfileToAdd = {
      created,
      updated: created,
      agent: toAdd.agent,
      account: toAdd.account || undefined,
      subscription: toAdd.subscription || undefined,
      boundary: toAdd.boundary || undefined,
      function: toAdd.function || undefined,
      baseUrl: nomarlizeBaseUrl(toAdd.baseUrl),
      issuer: toAdd.issuer,
      subject: toAdd.subject,
      keyPair: name,
      kid,
    };

    const profile = await this.dotConfig.setProfile(name, fullProfileToAdd);
    profile.name = name;

    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      await this.setDefaultProfileName(name);
    }

    return profile;
  }

  public async updateProfile(name: string, settings: IFusebitProfileSettings): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);

    profile.account = settings.account;
    profile.subscription = settings.subscription;
    profile.boundary = settings.boundary;
    profile.function = settings.function;
    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(name, profile);
    profile.name = name;

    return profile;
  }

  public async copyProfile(name: string, copyTo: string, overWrite: boolean): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);
    const copyToExists = await this.profileExists(copyTo);

    if (copyToExists && !overWrite) {
      throw FusebitProfileError.profileAlreadyExists(copyTo);
    }

    profile.created = new Date().toLocaleString();
    profile.updated = profile.created;

    await this.dotConfig.setProfile(copyTo, profile);
    profile.name = copyTo;

    return profile;
  }

  public async renameProfile(name: string, renameTo: string, overWrite: boolean): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);
    const renameToExists = await this.profileExists(renameTo);

    if (renameToExists && !overWrite) {
      throw FusebitProfileError.profileAlreadyExists(renameTo);
    }

    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(renameTo, profile);
    await this.dotConfig.removeProfile(name);
    profile.name = renameTo;

    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    const profile = await this.getProfileOrThrow(name);
    await this.dotConfig.removeProfile(name);

    const kid = profile.kid;
    if (!(await this.isKeyUsedByAnyProfiles(name, kid))) {
      await Promise.all([this.dotConfig.removeKeyPair(name, kid), this.dotConfig.removeCachedCreds(name, kid)]);
    }
  }

  public async getPublicKey(name: string): Promise<string> {
    const profile = await this.getProfileOrThrow(name);
    return this.dotConfig.getPublicKey(profile.keyPair, profile.kid);
  }

  public async getAccessToken(name?: string, ignoreCache: boolean = false): Promise<string> {
    const profile = await this.getProfileOrDefaultOrThrow(name);
    if (!ignoreCache) {
      return this.generateAccessToken(profile);
    }

    let accessToken = await this.getCachedAccessToken(profile);
    return accessToken !== undefined ? accessToken : await this.generateAccessToken(profile);
  }

  public async getExecutionProfile(name?: string, ignoreCache: boolean = false): Promise<IFusebitExecutionProfile> {
    const profile = await this.getProfileOrDefaultOrThrow(name);
    const accessToken = await this.getAccessToken(name, ignoreCache);
    return {
      accessToken,
      baseUrl: profile.baseUrl,
      account: profile.account,
      subscription: profile.subscription || undefined,
      boundary: profile.boundary || undefined,
      function: profile.function || undefined,
    };
  }

  private async isKeyUsedByAnyProfiles(name: string, kid: string): Promise<boolean> {
    const profiles = await this.getProfilesUsingKey(name, kid);
    return profiles.length > 0;
  }

  private async getProfilesUsingKey(name: string, kid: string): Promise<IFusebitProfile[]> {
    const profiles = await this.listProfiles();
    return profiles.filter(profile => profile.keyPair === name && profile.kid === kid);
  }

  private async generateKid(name: string) {
    let kid;
    do {
      kid = random({ lengthInBytes: kidLength / 2 }) as string;
    } while (await this.dotConfig.publicKeyExists(name, kid));
    return kid;
  }

  private async generateAccessToken(profile: IFusebitProfile): Promise<string> {
    const privateKey = await this.dotConfig.getPrivateKey(profile.keyPair, profile.kid);

    const expires = new Date(Date.now() + 1000 * expireInSeconds);
    const options = {
      algorithm: jwtAlgorithm,
      expiresIn: expireInSeconds,
      audience: profile.baseUrl,
      issuer: profile.issuer,
      subject: profile.subject,
      keyid: profile.kid,
      header: {
        jwtId: random(),
      },
    };

    const accessToken = await signJwt({}, privateKey, options);
    const cachedCredsEntry = { accessToken, has: getKeyHash(profile), expires: expires.toLocaleString() };
    await this.dotConfig.setCachedCreds(profile.keyPair, profile.kid, cachedCredsEntry);

    return accessToken;
  }

  private async getCachedAccessToken(profile: IFusebitProfile): Promise<string | undefined> {
    const cachedCredsEntry = await this.dotConfig.getCachedCreds(profile.name, profile.kid);
    if (cachedCredsEntry) {
      if (cachedCredsEntry.hash === getKeyHash(profile)) {
        const expires = new Date(cachedCredsEntry.expires).valueOf();
        const cutOff = Date.now() - minExpireInterval;
        if (expires > cutOff) {
          return cachedCredsEntry.accessToken;
        }
      }
    }

    return undefined;
  }
}