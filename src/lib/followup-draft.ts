import { extractScoringSignals } from "./lead-scoring-signals.ts";
import { safeModelText } from "./qualification.ts";
export type BrandVoice = "friendly" | "professional" | "concise";
export type BrandLanguage = "english" | "hinglish";
export function dueStage(createdAt: string, now = Date.now()): 24 | 72 | 168 | null {
 const age = (now-Date.parse(createdAt))/3600_000;
 return !Number.isFinite(age) || age<24 || age>=240 ? null : age>=168 ? 168 : age>=72 ? 72 : 24;
}
export async function replyDraft(input: Parameters<typeof extractScoringSignals>[0], voice: BrandVoice, language: BrandLanguage, env: Record<string,string|undefined> = process.env, send: typeof fetch = fetch) {
 const text = language === "hinglish" ? "Hi! Aapki enquiry ke liye shukriya. Kya aap apni requirement aur baat karne ka suitable time bata sakte hain?" :
  voice === "concise" ? "Thanks for your enquiry. What do you need, and when can we contact you?" :
  voice === "professional" ? "Thank you for your enquiry. Please share your requirements and a convenient time for us to contact you." :
  "Hi! Thanks for reaching out. How can we help, and when would be a good time to chat?";
 if (!env.GEMINI_API_KEY || !/^[a-zA-Z0-9._-]{2,80}$/.test(env.GEMINI_MODEL||"")) return {text,engine:"rules"};
 try {
  const response=await send(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},signal:AbortSignal.timeout(8000),body:JSON.stringify({contents:[{parts:[{text:`Draft one short follow-up reply in ${language}, with a ${voice} business voice. Ask about requirements and preferred contact time. No names, contacts, links, offers, promises, invented facts, or placeholders. Signals: ${JSON.stringify(extractScoringSignals(input))}`}]}],generationConfig:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{text:{type:"STRING"}},required:["text"]},maxOutputTokens:250}})});
  if (!response.ok) return {text,engine:"rules"};
  const data=await response.json();const raw=data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if(typeof raw!=="string"||raw.length>2048)return {text,engine:"rules"};
  const parsed=JSON.parse(raw);
  if(!parsed||Array.isArray(parsed)||Object.keys(parsed).join()!=="text"||!safeModelText(parsed.text,500))return {text,engine:"rules"};
  return {text:parsed.text as string,engine:"gemini"};
 }catch{return {text,engine:"rules"};}
}
