#!/usr/bin/env bash

# -- Standard Header --
set -e
echoerr() { printf "%s\n" "$*" >&2; }
FUSEOPS="node cli/fusebit-ops-cli/libc/index.js"
export FUSEBIT_DEBUG=

# -- cloning fusetunnel --
git clone https://github.com/fusebit/tunnel-server

# -- Optional Parameters --
AWS_PROFILE=${AWS_PROFILE:=default}
TUNNELSERVER_VERSION=$(jq -r '.version' ./tunnel-server/package.json)

echoerr "Deploying to npm (ignoring error on republish of same version)"
cd tunnel-server/
npm publish 1>&2 --access public || true

echoerr "Testing installation"
npm install -g @fusebit/tunnel-server@${TUNNELSERVER_VERSION} 1>&2

echoerr "Completed successfully:"
echo { \"version\": \"${TUNNELSERVER_VERSION}\" }
