const { assert } = require('chai');
const fetch = require('node-fetch');

describe('Annuity API Gateway Integration', function () {
  it('submits, executes, and checks a deal via the API', async function () {
    // 1. Submit a deal
    const correlationId = 'ABCD-4007';
    const payload = {
      completionHorizonInSeconds: "3600",
      correlationId,
      participants: {
        buyer: {
          participant: "blueBank",
          credential: "string",
          wallet: {
            offerChain: "hedera",
            offerAsset: "asset",
            offerAmount: "1000000",
            offerAssetAddress: "0x0000000000000000000000000000000000000001",
            deliveryAssetAddress: "0x0000000000000000000000000000000000000002"
          }
        },
        seller: {
          participant: "redBank",
          credential: "string",
          wallet: {
            bidChain: "hedera",
            bidAsset: "asset",
            tokenIssuance: "real-time",
            tokenType: "erc-20",
            tokenMetaData: {
              term: "4",
              interestRate: "6"
            },
            bidAmount: "1000000",
            bidAssetAddress: "0x0000000000000000000000000000000000000003",
            deliveryAssetAddress: "0x0000000000000000000000000000000000000004",
            deliveryCurrencyAddress: "0x0000000000000000000000000000000000000005"
          }
        }
      },
      swapConditions: {
        status: "execution"
      }
    };

    // POST /deal
    const submitRes = await fetch('http://127.0.0.1:4000/deal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const submitData = await submitRes.json();
    assert.equal(submitData.correlationId, correlationId, 'Deal submitted and correlationId matches');
    assert.equal(submitData.status, 'created', 'Deal status is created');

    // 2. GET /deal/:correlationId
    const statusRes = await fetch(`http://127.0.0.1:4000/deal/${correlationId}`);
    const statusData = await statusRes.json();
    assert.equal(statusData.status, 'created', 'Deal status is still created');
    assert.ok(statusData.annuityAddress, 'Annuity contract deployed');

    // 3. POST /deal/:correlationId/execute
    const execRes = await fetch(`http://127.0.0.1:4000/deal/${correlationId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const execData = await execRes.json();
    if (!execData || execData.status !== 'executed') {
      console.error('Execute endpoint response:', execData);
    }
    assert.equal(execData.status, 'executed', 'Deal executed');

    // 4. GET /deal/:correlationId (after execution)
    const finalRes = await fetch(`http://127.0.0.1:4000/deal/${correlationId}`);
    const finalData = await finalRes.json();
    assert.equal(finalData.status, 'executed', 'Deal status is executed');
    assert.equal(finalData.contractState.issued, true, 'Annuity issued');
    assert.equal(finalData.contractState.expired, false, 'Annuity not expired');
  }).timeout(30000);
});
