const { getStorageContext, errorHandler } = require('../storage');
const create_error = require('http-errors');

function storageGet() {
  return (req, res) => {
    getStorageContext().then(storageContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const storagePath = req.params['0'];

      storageContext.storage
        .get(resolvedAgent, accountId, subscriptionId, storageId, storagePath)
        .then(result => {
          if (result && result.etag) {
            res.set('Etag', `W/"${result.etag}"`);
          }
          res.json(result);
        })
        .catch(errorHandler(res));
    });
  };
}

function storageList() {
  return (req, res) => {
    getStorageContext().then(storageContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const limit = req.query.count;
      const next = req.query.next;
      const options = { limit, next };

      storageContext.storage
        .list(resolvedAgent, accountId, subscriptionId, options)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function storagePut() {
  return (req, res, next) => {
    getStorageContext().then(storageContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const storagePath = req.params['0'];
      const storage = req.body;
      const etag = req.header('If-Match');
      if (storage.etag && etag && storage.etag !== etag) {
        const message = [
          `The etag in the body '${storage.etag}'`,
          `does not match the etag in the If-Match header '${etag}'`,
        ].join(' ');
        return next(new create_error(400, message));
      } else {
        storage.etag = etag || storage.etag;
      }

      storageContext.storage
        .set(resolvedAgent, accountId, subscriptionId, storageId, storage, storagePath)
        .then(result => {
          if (result && result.etag) {
            res.set('Etag', `W/"${result.etag}"`);
          }
          res.json(result);
        })
        .catch(errorHandler(res));
    });
  };
}

function storageDelete() {
  return (req, res) => {
    getStorageContext().then(storageContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const storagePath = req.params['0'];
      const etag = req.header('If-Match');

      storageContext.storage
        .delete(resolvedAgent, accountId, subscriptionId, storageId, etag, storagePath)
        .then(() => {
          res.status(204);
          res.end();
        })
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  storageList,
  storageGet,
  storagePut,
  storageDelete,
};