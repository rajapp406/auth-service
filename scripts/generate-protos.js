const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

const PROTO_DIR = path.resolve(__dirname, '../src/protos');
const MODEL_DIR = path.resolve(__dirname, '../src/generated');
const PROTOC_PATH = path.resolve(__dirname, '../node_modules/grpc-tools/bin/protoc');
const PLUGIN_PATH = path.resolve(__dirname, '../node_modules/grpc-tools/bin/grpc_node_plugin');
const TS_PLUGIN_PATH = path.resolve(__dirname, '../node_modules/.bin/protoc-gen-ts');

// Create the output directory if it doesn't exist
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// Generate JavaScript files
try {
  // Generate JavaScript and gRPC service definitions
  console.log('Generating JavaScript and gRPC service definitions...');
  execSync(
    `"${PROTOC_PATH}" ` +
    `--plugin=protoc-gen-grpc="${PLUGIN_PATH}" ` +
    `--js_out=import_style=commonjs,binary:${MODEL_DIR} ` +
    `--grpc_out=grpc_js:${MODEL_DIR} ` +
    `--plugin=protoc-gen-ts="${TS_PLUGIN_PATH}" ` +
    `--ts_out=service=grpc-node,mode=grpc-js:${MODEL_DIR} ` +
    `--proto_path=${PROTO_DIR} ` +
    `"${path.join(PROTO_DIR, 'user_service.proto')}"`,
    { stdio: 'inherit' }
  );

  console.log('Successfully generated protobuf files');
} catch (error) {
  console.error('Failed to generate protobuf files:', error);
  process.exit(1);
}
