import express from 'express';

import { Model } from '@5qtrs/db';
import { v2Permissions } from '@5qtrs/constants';

import * as common from '../../middleware/common';
import { SessionedEntityService } from '../../service';
import * as Validation from '../../validation/session';
import * as ValidationCommon from '../../validation/entities';

const createSessionRouter = (SessionService: SessionedEntityService<any, any>) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    common.management({
      validate: { params: ValidationCommon.EntityIdParams, body: Validation.SessionCreate },
      authorize: { operation: v2Permissions.sessionPost },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const session = await SessionService.createSession(
          {
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: req.params.entityId,
          },
          req.body
        );
        res.status(session.statusCode).json({
          ...Model.entityToSdk(session.result),
          id: Model.decomposeSubordinateId(session.result.id).entityId,
        });
      } catch (error) {
        console.log(error);
        return next(error);
      }
    }
  );

  //  Get full value of session.
  router.route('/result/:sessionId').get(
    common.management({
      validate: { params: ValidationCommon.EntityIdParams },
      authorize: { operation: v2Permissions.sessionResult },
    }),
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const session = await SessionService.getSession({
          accountId: req.params.accountId,
          subscriptionId: req.params.subscriptionId,
          id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
        });
        let result: any = {
          id: req.params.sessionId,
          input: session.result.data.input,
          output: session.result.data.output,
          components: session.result.data.components,
        };

        if (session.result.data.mode === 'leaf') {
          result = {
            ...result,
            target: session.result.data.target,
            name: session.result.data.stepName,
            dependsOn: session.result.data.dependsOn,
          };
        }
        res.status(session.statusCode).json(result);
      } catch (error) {
        console.log(error);
        return next(error);
      }
    }
  );

  router
    .route('/:sessionId')
    // Get 'public' value of session
    .get(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        authorize: { operation: v2Permissions.sessionGet },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const session = await SessionService.getSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });
          const result = {
            id: req.params.sessionId,
            input: session.result.data.input,
            dependsOn: session.result.data.dependsOn,
          };
          res.status(session.statusCode).json(result);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    )
    // Write to the 'output' of the session.
    .put(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams, body: Validation.SessionPut },
        authorize: { operation: v2Permissions.sessionPut },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const session = await SessionService.putSession(
            {
              accountId: req.params.accountId,
              subscriptionId: req.params.subscriptionId,
              id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
            },
            req.body
          );
          const result = { id: req.params.sessionId, input: session.result.input };
          res.status(session.statusCode).json(result);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    )
    // Commit the session, creating all of the appropriate artifacts
    .post(
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        authorize: { operation: v2Permissions.sessionCommit },
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const operation = await SessionService.postSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            // Sessions use the non-unique component name, but instances and identities use the database id.
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });
          res.status(operation.statusCode).json(operation.result);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  router
    // Get a new session and a 302 redirect url for the first step.
    .get(
      '/:sessionId/start',
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        // No auth: called by the browser to start a session, and be redirected to the next endpoint.
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { result } = await SessionService.startSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });

          // Send the browser to the configured handler url with the sessionid as a query parameter
          const redirectUrl = `${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}${result.path}?session=${result.sessionId}&redirect_uri=${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}/session/${result.sessionId}/callback`;
          return res.redirect(redirectUrl);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  router
    // Finish a session and get the next component's redirect url.
    .get(
      '/:sessionId/callback',
      common.management({
        validate: { params: ValidationCommon.EntityIdParams },
        // No auth: called by the browser to indicate completion of a session, and to be dispatched to the next
        // endpoint.
      }),
      async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        try {
          const { result } = await SessionService.finishSession({
            accountId: req.params.accountId,
            subscriptionId: req.params.subscriptionId,
            id: Model.createSubordinateId(SessionService.entityType, req.params.entityId, req.params.sessionId),
          });

          if (result.mode === 'url') {
            // Session is complete - send to final redirectUrl.
            return res.redirect(result.url);
          }

          // Send the browser to start the next session.
          const redirectUrl = `${process.env.API_SERVER}/v2/account/${result.accountId}/subscription/${result.subscriptionId}/${result.entityType}/${result.entityId}${result.path}?session=${result.sessionId}`;
          return res.redirect(redirectUrl);
        } catch (error) {
          console.log(error);
          return next(error);
        }
      }
    );

  return router;
};

export default createSessionRouter;