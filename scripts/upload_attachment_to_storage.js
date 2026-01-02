/**
 * Simple script to upload a local PDF to Firebase Storage and print the public URL.
 * Usage (PowerShell):
 *   $env:FIREBASE_PROJECT_ID='...'; $env:FIREBASE_CLIENT_EMAIL='...'; $env:FIREBASE_PRIVATE_KEY='...'; $env:NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET='your-bucket'; node scripts/upload_attachment_to_storage.js "C:\\Users\\yatha\\OneDrive\\Desktop\\ai-enhanced-resume-SHERPANY.pdf" "uploads/ai-enhanced-resume-SHERPANY.pdf"
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const filePath = process.argv[2];
  const destPath = process.argv[3] || `uploads/${path.basename(filePath)}`;
  if (!filePath) {
    console.error('Usage: node scripts/upload_attachment_to_storage.js <local-file-path> [destPath]');
    process.exit(1);
  }

  // Lazy require firebase-admin to avoid failing if not configured
  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('Please install firebase-admin (npm install firebase-admin)');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey || !bucketName) {
    console.error('Missing required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: bucketName,
    });
  }

  const bucket = admin.storage().bucket();

  console.log(`Uploading ${filePath} -> ${destPath} to bucket ${bucketName}`);

  await bucket.upload(filePath, { destination: destPath, metadata: { contentType: 'application/pdf' } });

  // Create signed URL (30 days) - using Date object for Firebase v4 compatibility
  const file = bucket.file(destPath);
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expirationDate
  });
  console.log(`Signed URL (30d, expires ${expirationDate.toISOString()}):`, url);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
