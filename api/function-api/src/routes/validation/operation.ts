const Joi = require('joi');

import * as Common from './common';

const OperationValidation = Joi.object().keys({
  verb: Joi.string().required(),
  type: Joi.string().required(),
  code: Joi.number().required(),
  message: Joi.string().optional(),
  location: Joi.object()
    .keys({
      accountId: Common.accountId.required(),
      subscriptionId: Common.subscriptionId.required(),
      entityId: Common.entityId.required(),
      entityType: Joi.string().required(),
    })
    .required(),
});

export default OperationValidation;
