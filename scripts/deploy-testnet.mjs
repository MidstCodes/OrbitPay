/**
 * OrbitPay · Soroban Contract Deployment to Stellar Testnet
 *
 * Two-step flow: uploadContractWasm → createCustomContract
 * Writes deployed addresses into .env.template automatically.
 *
 * Usage:
 *   node scripts/deploy-testnet.mjs
 *   SOROBAN_SECRET_KEY=SC... node scripts/deploy-testnet.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RPC = 'https://soroban-testnet.stellar.org';
const FB = 'https://friendbot.stellar.org';
const PASSPHRASE = 'Test SDF Network ; September 2015';

const CONTRACTS = [
  { name: 'Payment',    wasm: 'contracts/target/wasm32v1-none/release/orbitpay_payment.wasm',    envVar: 'NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS' },
  { name: 'Notification', wasm: 'contracts/target/wasm32v1-none/release/orbitpay_notification.wasm', envVar: 'NEXT_PUBLIC_NOTIFICATION_CONTRACT_ADDRESS' },
  { name: 'History',    wasm: 'contracts/target/wasm32v1-none/release/orbitpay_history.wasm',    envVar: 'NEXT_PUBLIC_HISTORY_CONTRACT_ADDRESS' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clog = (msg) => process.stdout.write(msg);

async function pollTx(server, hash, label) {
  for (let i = 0; i < 60; i++) {
    const r = await server.getTransaction(hash);
    if (r.status === 'SUCCESS') return r;
    if (r.status === 'FAILED') throw new Error(`${label} FAILED: ${JSON.stringify(r)}`);
    await sleep(2000);
  }
  throw new Error(`${label} timed out`);
}

function updateEnvTemplate(addresses) {
  const tplPath = path.resolve(ROOT, '.env.template');
  if (!fs.existsSync(tplPath)) return;
  let content = fs.readFileSync(tplPath, 'utf-8');

  for (const c of CONTRACTS) {
    const addr = addresses[c.name] || '';
    const regex = new RegExp(`^${c.envVar}=.*$`, 'm');
    const line = `${c.envVar}=${addr}`;
    if (regex.test(content)) content = content.replace(regex, line);
    else content += `\n${line}`;
  }

  fs.writeFileSync(tplPath, content, 'utf-8');
  clog(`\n  ✓ Updated .env.template\n`);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  OrbitPay · Testnet Deploy                ║');
  console.log('╚══════════════════════════════════════════╝\n');

  const { SorobanRpc, TransactionBuilder, Operation, Keypair, hash } = await import('@stellar/stellar-sdk');
  const server = new SorobanRpc.Server(RPC, { allowHttp: true });

  // Account setup
  let kp;
  if (process.env.SOROBAN_SECRET_KEY) {
    kp = Keypair.fromSecret(process.env.SOROBAN_SECRET_KEY);
    clog(`Using existing: ${kp.publicKey()}\n`);
  } else {
    kp = Keypair.random();
    clog(`New keypair:     ${kp.publicKey()}\n`);
    clog('Funding via Friendbot…');
    const fb = await fetch(`${FB}?addr=${kp.publicKey()}`);
    if (!fb.ok) throw new Error(`Friendbot: ${await fb.text()}`);
    clog(' done\n');
  }

  const pk = kp.publicKey();
  const deployed = {};

  for (const c of CONTRACTS) {
    const wasmPath = path.resolve(ROOT, c.wasm);
    if (!fs.existsSync(wasmPath)) { clog(`\n  ⚠ ${c.name} — WASM not found\n`); continue; }

    const bytes = fs.readFileSync(wasmPath);
    const wasmHashHex = hash(bytes).toString('hex');
    clog(`\n  ── ${c.name}  (${(bytes.length / 1024).toFixed(1)} KB) ──\n`);

    try {
      // Step 1: Upload
      clog('  ① Uploading WASM…\n');
      const acct1 = await server.getAccount(pk);
      const tx1 = new TransactionBuilder(acct1, { fee: '100000', networkPassphrase: PASSPHRASE })
        .addOperation(Operation.uploadContractWasm({ wasm: bytes.toString('base64'), source: pk }))
        .setTimeout(300).build();
      tx1.sign(kp);
      const sim1 = await server.simulateTransaction(tx1);
      if (sim1.error) {
        clog(`     Simulation error: ${sim1.error?.message || JSON.stringify(sim1.error)}\n`);
        throw new Error('WASM upload rejected by testnet — version mismatch likely');
      }
      const tx1p = SorobanRpc.assembleTransaction(tx1, sim1);
      tx1p.sign(kp);
      const s1 = await server.sendTransaction(tx1p);
      if (s1.error) throw new Error(`Send: ${s1.error}`);
      await pollTx(server, s1.hash, 'Upload');
      clog('     ✓ Uploaded\n');

      // Step 2: Create contract
      clog('  ② Creating contract…\n');
      const acct2 = await server.getAccount(pk);
      const tx2 = new TransactionBuilder(acct2, { fee: '100000', networkPassphrase: PASSPHRASE })
        .addOperation(Operation.createCustomContract({ wasmHash: wasmHashHex, source: pk }))
        .setTimeout(300).build();
      tx2.sign(kp);
      const sim2 = await server.simulateTransaction(tx2);
      if (sim2.error) throw new Error(`Create sim: ${JSON.stringify(sim2.error)}`);
      const tx2p = SorobanRpc.assembleTransaction(tx2, sim2);
      tx2p.sign(kp);
      const s2 = await server.sendTransaction(tx2p);
      if (s2.error) throw new Error(`Create send: ${s2.error}`);
      const r2 = await pollTx(server, s2.hash, 'Create');

      // Extract contract address
      let cid = r2.createdContractId || null;
      if (!cid && r2.returnValue) cid = r2.returnValue;

      deployed[c.name] = cid;
      clog(`     ✓ ${cid}\n`);
    } catch (err) {
      clog(`  ✗ ${err.message}\n`);
      if (err.message.includes('version mismatch')) {
        clog('\n    The testnet rejected the WASM bytecode. This is a Soroban version\n');
        clog('    mismatch. Deploy from a local machine with:\n');
        clog('      source $HOME/.cargo/env && cargo install soroban-cli\n');
        clog('      cd contracts && CARGO_BUILD_TARGET=wasm32v1-none cargo build --release\n');
        clog('      SOROBAN_SECRET_KEY=<key> ../scripts/deploy.sh\n');
      }
    }
  }

  // Write results to .env.template (even partial results)
  updateEnvTemplate(deployed);

  clog('\n────────────────────────────────────────\n');
  for (const c of CONTRACTS) {
    const a = deployed[c.name];
    clog(`  ${c.envVar}=${a || '(not deployed — using simulation mode)'}\n`);
  }
  clog('\nhttps://stellar.expert/explorer/testnet\n');
  clog('Done.\n');
}

main().catch((e) => { console.error('\nFatal:', e.message); process.exit(1); });
