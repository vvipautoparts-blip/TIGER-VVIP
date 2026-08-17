'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAwsProductionBindings } = require('../scripts/media/server/aws/f05-aws-production-bindings.js');

function options(overrides={}) {
  const listing={listingId:'listing_1',ownerClerkUserId:'user_1'};
  return {
    listingStore:{async getById(id,ctx){return id===listing.listingId&&ctx?.ownerClerkUserId===listing.ownerClerkUserId?listing:null;}},
    imageEngine:{backend:'trusted-image-engine',version:'1.0.0',async inspect(){return {};},async rewrite(bytes){return {bytes:new Uint8Array(bytes)};}},
    auditWriter:async()=>true,
    telemetryWriter:async()=>true,
    alertNotifier:async()=>true,
    circuitPolicyWriter:async()=>true,
    ...overrides
  };
}

test('production binding fails closed without canonical dependencies',()=>{
  assert.throws(()=>createAwsProductionBindings(),/media_production_binding_unavailable/);
  assert.throws(()=>createAwsProductionBindings(options({listingStore:null})),/media_production_binding_unavailable/);
  assert.throws(()=>createAwsProductionBindings(options({imageEngine:null})),/media_production_binding_unavailable/);
});

test('ad media authorization follows Clerk listing ownership',async()=>{
  const deps=createAwsProductionBindings(options());
  assert.equal(await deps.authorizeAdMedia({clerkUserId:'user_1',authenticated:true},{listingId:'listing_1'}),true);
  assert.equal(await deps.authorizeAdMedia({clerkUserId:'user_2',authenticated:true},{listingId:'listing_1'}),false);
  assert.equal(await deps.authorizeAdMedia({clerkUserId:'user_1',authenticated:false},{listingId:'listing_1'}),false);
});

test('AWS runtime exposes JPEG/WebP only and no HEIC server decoder',()=>{
  const deps=createAwsProductionBindings(options());
  assert.equal(deps.productionRuntime.environment,'production');
  assert.equal(deps.productionRuntime.provider,'aws');
  assert.equal(deps.productionRuntime.imageStack.jpeg,true);
  assert.equal(deps.productionRuntime.imageStack.webp,true);
  assert.equal(deps.productionRuntime.imageStack.heicDecode,false);
  assert.equal(typeof deps.imageStack.decodeHeic,'undefined');
  assert.equal(typeof deps.imageStack.decodeHeif,'undefined');
});
