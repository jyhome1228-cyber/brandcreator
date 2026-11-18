/** Browser-only beta access proof. Not a server account or identity verification. */
const KEY = 'bramer-local-beta-proof-v1';
type BetaProof={salt:string; digest:string; occupation:string};
function normalize(name:string,phone:string){return name.trim().normalize('NFC').toLowerCase()+'|'+phone.replace(/\D/g,'');}
async function digest(text:string){
  const bytes=new TextEncoder().encode(text);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function hasLocalBetaRegistration(){
  try { return Boolean(localStorage.getItem(KEY)); } catch {return false;}
}
export async function registerLocalBeta(name:string,phone:string,occupation:string){
  if(!crypto?.subtle)throw new Error('보안 연결(HTTPS)에서만 베타 등록이 가능합니다.');
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const proof:BetaProof={salt,digest:await digest(salt+'|'+normalize(name,phone)),occupation};
  localStorage.setItem(KEY,JSON.stringify(proof));
  sessionStorage.setItem('bramer-beta-session-v1','active');
}
export async function verifyLocalBeta(name:string,phone:string){
  try {
    const raw=localStorage.getItem(KEY);
    if(!raw)return false;
    const proof=JSON.parse(raw) as BetaProof;
    const matching=(await digest(proof.salt+'|'+normalize(name,phone)))===proof.digest;
    if(matching)sessionStorage.setItem('bramer-beta-session-v1','active');
    return matching;
  } catch {return false;}
}
