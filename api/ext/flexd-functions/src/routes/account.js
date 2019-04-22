const { Config } = require('@5qtrs/config');
const { AwsCreds } = require('@5qtrs/aws-cred');
const { AwsDeployment } = require('@5qtrs/aws-deployment');
const { AccountContext } = require('@5qtrs/account');
const { AccountDataAwsContextFactory } = require('@5qtrs/account-data-aws');

let accountContext;

async function getAccountContext() {
  if (!accountContext) {
    const config = new Config();
    const creds = await AwsCreds.create({
      account: process.env.AWS_ACCOUNT,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      useMfa: false,
    });
    const deployment = await AwsDeployment.create({
      regionCode: process.env.AWS_REGION,
      account: process.env.AWS_ACCOUNT,
      key: process.env.DEPLOYMENT_KEY,
    });
    const factory = await AccountDataAwsContextFactory.create(creds, deployment);
    accountContext = await AccountContext.create(config, factory);
  }
  return accountContext;
}

async function getResolvedAgent(accountId, token) {
  const accountContext = await getAccountContext();
  const isRootAgent = token === process.env.API_AUTHORIZATION_KEY;
  return accountContext.getResolvedAgent(accountId, token, isRootAgent);
}

function errorHandler(res) {
  return error => {
    if (error.code === 'unauthorized') {
      console.log(error.message);
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (error.code === 'databaseError') {
      console.log(error.message);
      return res.status(500).json({ message: 'An unknown error occured on the server' });
    }

    if (error.code) {
      const status = error.code.indexOf('no') === 0 ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    console.log(error);
    return res.status(500).json({ message: 'An unknown error occured on the server' });
  };
}

module.exports = {
  getAccountContext,
  getResolvedAgent,
  errorHandler,
};
