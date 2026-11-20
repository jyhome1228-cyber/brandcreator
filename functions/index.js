const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();

exports.recoverBetaAccount = onRequest({
  region: 'asia-northeast3',
  cors: ['https://bramer.cloud', 'https://www.bramer.cloud', 'http://localhost:5173'],
  invoker: 'public',
  maxInstances: 5,
}, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!bearer) { res.status(401).json({ error: 'unauthenticated' }); return; }
  try {
    const decoded = await getAuth().verifyIdToken(bearer[1], true);
    // Phone OTP is required; knowing a person's name and phone alone is never sufficient.
    const phone = decoded.phone_number;
    if (decoded.firebase?.sign_in_provider !== 'phone' || typeof phone !== 'string' || !/^\+8210\d{8}$/.test(phone)) {
      res.status(403).json({ error: 'phone_verification_required' }); return;
    }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().normalize('NFC') : '';
    if (!name || name.length > 40) { res.status(400).json({ error: 'invalid_name' }); return; }
    const localPhone = '0' + phone.slice(3);
    const db = getFirestore();
    const ownRef = db.collection('betaTesters').doc(decoded.uid);
    if ((await ownRef.get()).exists) { res.status(200).json({ recovered: true }); return; }
    const matches = await db.collection('betaTesters').where('phone', '==', localPhone).limit(25).get();
    const prior = matches.docs.find(doc => doc.get('name')?.trim().normalize('NFC') === name && doc.get('status') === 'active');
    if (!prior) { res.status(200).json({ recovered: false }); return; }
    await db.runTransaction(async tx => {
      const existing = await tx.get(ownRef);
      if (existing.exists) return;
      // Preserve the original anonymous record for audit/administrator access; no public list access.
      tx.create(ownRef, {
        uid: decoded.uid, name, phone: localPhone, occupation: prior.get('occupation'),
        registeredAt: prior.get('registeredAt') || FieldValue.serverTimestamp(),
        status: 'active', verifiedPhone: phone, migratedFrom: prior.id, migratedAt: FieldValue.serverTimestamp(),
      });
    });
    res.status(200).json({ recovered: true });
  } catch (error) {
    console.error('beta recovery failed:', error && error.code || 'internal');
    res.status(500).json({ error: 'internal' });
  }
});
