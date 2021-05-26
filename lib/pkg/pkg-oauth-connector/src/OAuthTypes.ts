interface IOAuthConfig {
  authorizationUrl: string;
  audience?: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  vendorPrefix?: string;
  extraParams?: string;
  scope: string;
  accessTokenExpirationBuffer: number;
  refreshErrorLimit: number;
  refreshWaitCountLimit: number;
  refreshInitialBackoff: number;
  refreshBackoffIncrement: number;

  mountUrl: string;
  callbackUrl: string;
}

interface IOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  expires_at: number;
  status: string;
  timestamp: number;
  refreshErrorCount: number;
}

export { IOAuthConfig, IOAuthToken };