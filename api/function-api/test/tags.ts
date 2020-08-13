import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

export const deleteAll = async (accountId: string, boundaryId: string) => {
  expect(
    await new Promise((resolve, reject) => {
      dynamo.scan({ TableName: manage_tags.keyValueTableName }, async (e, d) => {
        if (!d.Items) {
          return resolve(null);
        }
        validateEandD(accountId, boundaryId, e, d);
        for (const item of d.Items) {
          await new Promise((res, rej) =>
            dynamo.deleteItem(
              {
                TableName: manage_tags.keyValueTableName,
                Key: { category: { S: item.category.S }, key: { S: item.key.S } },
              },
              res
            )
          );
        }
        resolve(null);
      });
    })
  ).toBeNull();
};

const validateEandD = (accountId: string, boundaryId: string, e: any, d: any) => {
  expect(e).toBeNull();
  expect(d.Items).toBeDefined();
  if (!d.Items) {
    return;
  }

  // Make sure we filter out anything that doesn't match this.
  d.Items = d.Items.filter(
    (i: any) =>
      (i.category.S === manage_tags.TAG_CATEGORY_BOUNDARY || i.category.S === manage_tags.TAG_CATEGORY_SUBSCRIPTION) &&
      i.accountId.S === accountId &&
      i.boundaryId.S === boundaryId
  );

  expect(d.Items.length).toBeDefined();
};

export const scanForTags = async (optionTags: any) => {
  // Scan, and make sure the expected tags are present.
  expect(
    await new Promise((resolve, reject) => {
      return dynamo.scan({ TableName: manage_tags.keyValueTableName }, async (e, d) => {
        if (!d.Items) {
          return resolve(null);
        }
        validateEandD(optionTags[0][0].accountId, optionTags[0][0].boundaryId, e, d);

        const makeTag = (options: any, k: any, v: any) => [
          manage_tags.get_bound_sort_key(options, k, v),
          manage_tags.get_sub_sort_key(options, k, v),
        ];

        let tags: string[] = [];

        Object.entries(optionTags).forEach(([idx, [options, expectedTags]]: [any, any]) => {
          Object.entries(expectedTags).forEach(([k, v]) => {
            tags.push(...makeTag(options, k, v));
          });
        });

        if (tags.length !== d.Items.length) {
          const current = await getAllTags(optionTags[0][0].accountId, optionTags[0][0].boundaryId);
          console.log(JSON.stringify(current.filter((t: any) => tags.indexOf(t) === -1)));
          console.log(JSON.stringify(tags.filter((t: any) => current.indexOf(t) === -1)));
        }
        expect(tags).toHaveLength(d.Items.length);

        d.Items.forEach((i) => {
          expect(tags).toContain(i.key.S);
          delete tags[tags.indexOf(i.key.S as string)];
        });
        tags = tags.filter((i) => i);

        expect(tags).toHaveLength(0);
        return resolve();
      });
    })
  ).toBeFalsy();
};

export const getAllTags = async (accountId: string, boundaryId: string) => {
  const [err, results] = await new Promise((resolve, reject) => {
    return dynamo.scan({ TableName: manage_tags.keyValueTableName }, async (e, d) => {
      if (e) {
        return resolve([e, null]);
      }
      if (!d.Items) {
        return resolve([null, []]);
      }
      validateEandD(accountId, boundaryId, e, d);

      return resolve([null, d.Items.map((i) => i.key.S)]);
    });
  });
  expect(err).toBeFalsy();
  return results;
};