#!/usr/bin/env -S node --no-warnings

const fs = require("fs");
const path = require("path");
const homedir = require("os").homedir();

const userProfileRoot = `${homedir}/.fusebit`;
const userProfileName = "github-action-stage-us-west-2";
const opsProfileRoot = `${homedir}/.fusebit-ops`;
const opsProfileName = "github-automation";

const renderUserProfile = () => {
  const settings = JSON.parse(
    fs.readFileSync(path.join(userProfileRoot, "settings.json"))
  );
  const kid = settings.profiles[userProfileName].kid;
  const privateKey = fs
    .readFileSync(
      path.join(userProfileRoot, "keys", userProfileName, kid, "pri")
    )
    .toString();
  const publicKey = fs
    .readFileSync(
      path.join(userProfileRoot, "keys", userProfileName, kid, "pub")
    )
    .toString();

  const output = {
    settings: {
      profiles: { [userProfileName]: settings.profiles[userProfileName] },
      defaults: { profile: userProfileName },
    },
    keys: { privateKey, publicKey },
    keyPath: path.join("keys", userProfileName, kid),
    profileName: userProfileName,
  };
  return output;
};

const renderOpsProfile = () => {
  const settings = JSON.parse(
    fs.readFileSync(path.join(opsProfileRoot, "settings.json"))
  );
  const output = {
    settings: {
      profiles: { [opsProfileName]: settings.profiles[opsProfileName] },
      defaults: { profile: opsProfileName },
    },
    profileName: opsProfileName,
  };
  return output;
};

const result = { user: renderUserProfile(), ops: renderOpsProfile() };
console.log(JSON.stringify(result));