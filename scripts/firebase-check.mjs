// BRAMER read-only live Firebase diagnostics.
// Creates an anonymous auth token but never writes visitor statistics.
// Avoid printing credentials or ID tokens.
import fs from 'node:fs';
const contents = fs.readFileSync('src/firebaseWebConfig.ts','utf8');
const projectId = contents.match(/projectId:\s*'([^']+)'/)?.[1];
const apiKey = contents.match(/apiKey:\s*'([^']+)'/)?.[1];
if (!projectId || !apiKey) throw new Error('Missing public Firebase web configuration.');
const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + encodeURIComponent(apiKey);
const authResponse = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
const auth = await authResponse.json().catch(()=>({}));
const errorMessage = value => String(value?.error?.message || value?.error?.status || '').slice(0,120);
console.log('Firebase anonymous authentication HTTP:',authResponse.status,errorMessage(auth));
if (!authResponse.ok || !auth.idToken) process.exit(1);
const collection = 'https://firestore.googleapis.com/v1/projects/'+projectId+'/databases/(default)/documents/visitDaily';
const response = await fetch(collection+'?pageSize=1',{headers:{Authorization:'Bearer '+auth.idToken}});
const payload = await response.json().catch(()=>({}));
console.log('Firestore visitDaily collection read HTTP:',response.status,errorMessage(payload));
if (!response.ok) {
  console.error('Live Firebase rules appear to deny this read. Publishing rules to GitHub alone does not publish them in Firebase.');
  process.exit(1);
}
console.log('Anonymous sign-in and visitor collection read are accessible. This probe does not test writes.');
