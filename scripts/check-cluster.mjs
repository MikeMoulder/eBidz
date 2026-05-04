import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appModules = resolve(__dirname, '../app/node_modules');
const require = createRequire(import.meta.url);

const { Connection, PublicKey } = require(`${appModules}/@solana/web3.js`);
const {
  getMempoolAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getArciumProgramId,
} = require(`${appModules}/@arcium-hq/client`);

const CLUSTER_OFFSET = 456; // from Arcium.toml
const EBIDZ_PROG_ID = new PublicKey('4U9HFuutY2KJdrw3AFsQhf3Kvp6BvVjaGBmDB1bQAGBU');
const RPC_URL = 'https://api.devnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

const mempoolAddr = getMempoolAccAddress(CLUSTER_OFFSET);
const clusterAddr = getClusterAccAddress(CLUSTER_OFFSET);
const mxeAddr = getMXEAccAddress(EBIDZ_PROG_ID);

console.log('Arcium program ID:', getArciumProgramId().toBase58());
console.log('Cluster offset:   ', CLUSTER_OFFSET);
console.log('Mempool address:  ', mempoolAddr.toBase58());
console.log('Cluster address:  ', clusterAddr.toBase58());
console.log('MXE account:      ', mxeAddr.toBase58());

const [memInfo, clusterInfo, mxeInfo] = await Promise.all([
  connection.getAccountInfo(mempoolAddr),
  connection.getAccountInfo(clusterAddr),
  connection.getAccountInfo(mxeAddr),
]);

console.log('\nMempool exists:  ', !!memInfo, memInfo ? `(${memInfo.data.length} bytes)` : '');
console.log('Cluster exists:  ', !!clusterInfo, clusterInfo ? `(${clusterInfo.data.length} bytes)` : '');
console.log('MXE exists:      ', !!mxeInfo, mxeInfo ? `(${mxeInfo.data.length} bytes)` : '');
