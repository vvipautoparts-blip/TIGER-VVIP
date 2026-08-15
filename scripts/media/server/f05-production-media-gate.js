'use strict';
const { createProductionMediaPorts, validateMediaRequestEnvelope } = require('./f05-production-media-ports.js');
const { verifyAndRewriteCandidate } = require('./f05-derivative-gate.js');
const { assertProductionMediaRuntimeReady } = require('./f05-production-readiness.js');

function fail(){const e=new Error('media_request_invalid');e.code='media_request_invalid';throw e;}
function createProductionMediaGate(deps){
  assertProductionMediaRuntimeReady(deps);
  const ports=createProductionMediaPorts(deps);
  return Object.freeze({
    async handle(input){
      if(!input||!(input.candidateBytes instanceof Uint8Array)||!input.request)fail();
      const admitted=validateMediaRequestEnvelope(input.request);
      if(input.candidateBytes.length<1||input.candidateBytes.length>admitted.maxCandidateBytes||input.request.contentLength<input.candidateBytes.length)fail();
      return verifyAndRewriteCandidate({actor:input.actor,adScope:input.adScope,candidateBytes:input.candidateBytes,mediaPassport:input.mediaPassport},ports);
    }
  });
}
exports.createProductionMediaGate=createProductionMediaGate;
Object.freeze(module.exports);
