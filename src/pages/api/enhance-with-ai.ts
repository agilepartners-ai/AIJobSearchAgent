import type { NextApiRequest, NextApiResponse } from 'next';
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId.' });
    }

    const today = new Date().toISOString().split('T')[0];

    const usageRef = db
      .collection('users')
      .doc(userId)
      .collection('usage')
      .doc(today);

    const usageSnap = await usageRef.get();

    // If no doc exists → create one
    if (!usageSnap.exists) {
      await usageRef.set({
        resume_generations: 0,
        cover_letter_generations: 0,
        total_generations: 0,
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        allowed: true,
        total_generations: 0,
      });
    }

    const usageData = usageSnap.data();
    const totalGenerations = usageData?.total_generations || 0;

    // 🚫 Block if limit reached
    if (totalGenerations >= 25) {
      return res.status(429).json({
        message:
          'You’ve reached your daily limit of 25 AI resume/cover letter generations. Please try again tomorrow.',
      });
    }

    // ✅ Allow if under limit
    return res.status(200).json({
      allowed: true,
      total_generations: totalGenerations,
    });

  } catch (error) {
    console.error('[enhance-with-ai] Error:', error);
    return res.status(500).json({
      message: 'Failed to check daily usage limit.',
    });
  }
}