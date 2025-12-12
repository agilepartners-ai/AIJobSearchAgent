/**
 * Build-time script to write credentials to a file
 * This bypasses the AWS Lambda 4KB env var limit
 * The credentials file is included in the deployed bundle
 */

const fs = require('fs');
const path = require('path');

const credentialsDir = path.join(__dirname, '..', 'src', 'config');
const credentialsFile = path.join(credentialsDir, 'credentials.generated.json');

// Ensure directory exists
if (!fs.existsSync(credentialsDir)) {
  fs.mkdirSync(credentialsDir, { recursive: true });
}

const credentials = {
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || '',
    clientEmail: process.env.GCP_CLIENT_EMAIL || '',
    privateKey: (process.env.GCP_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
};

// Only write if we have credentials
if (credentials.gcp.privateKey || credentials.firebase.privateKey) {
  fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
  console.log('✅ Credentials written to', credentialsFile);
} else {
  console.log('⚠️ No credentials found in environment, skipping credentials file generation');
}
