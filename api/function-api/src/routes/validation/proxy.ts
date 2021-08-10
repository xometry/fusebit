const Joi = require('joi');

import * as Common from './common';

const commonParams = {
  params: Joi.object().keys({
    accountId: Common.accountId.required(),
    subscriptionId: Common.subscriptionId.required(),
    entityId: Common.entityId.required(),
  }),
};

export const AuthorizeRequest = {
  ...commonParams,
  query: Joi.object()
    .keys({
      client_id: Joi.string().required(),
      state: Common.sessionId.required(),
      redirect_uri: Joi.string().required(),
    })
    .unknown(),
};

export const CallbackRequest = {
  ...commonParams,
  query: Joi.object()
    .keys({
      state: Common.sessionId.required(),
      code: Joi.string().required(),
    })
    .unknown(),
};

export const TokenRequest = {
  ...commonParams,
  body: Joi.alternatives().try(
    Joi.object()
      .keys({
        grant_type: Joi.string().valid('authorization_code').required(),
        client_id: Joi.string().required(),
        client_secret: Joi.string().required(),
        code: Joi.string().min(2).required(),
        refresh_token: Joi.any().forbidden(),
      })
      .unknown(),
    Joi.object()
      .keys({
        grant_type: Joi.string().valid('refresh_token').required(),
        client_id: Joi.string().required(),
        client_secret: Joi.string().required(),
        code: Joi.any().forbidden(),
        refresh_token: Joi.string().min(2).required(),
      })
      .unknown()
  ),
};

export const RevokeRequest = {
  ...commonParams,
  body: Joi.object()
    .keys({
      // Not every revocation authenticates the same way, so consider this entry a placeholder for the moment.
      client_id: Joi.string().required(),
      token: Joi.string().required(),
      token_type_hint: Joi.string().valid('refresh_token', 'access_token').required(),
    })
    .unknown(),
};