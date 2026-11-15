"use client";
import Script from "next/script";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
type Callback={razorpay_payment_id:string;razorpay_signature:string};
type Options={key:string;amount:number;currency:string;order_id:string;name:string;description:string;handler:(result:Callback)=>Promise<void>;modal:{ondismiss:()=>void}};
type Checkout={open:()=>void;on:(event:string,handler:()=>void)=>void};
declare global {interface Window {Razorpay?:new(options:Options)=>Checkout}}
export function TestCheckout({plans}:{plans:{id:string;amount:number;durationDays:number}[]}){
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const pending=useRef(false),router=useRouter();
 function done(text:string){pending.current=false;setBusy(false);setMessage(text);}
 async function start(plan:string){
  if(pending.current||!ready||!window.Razorpay)return;
  pending.current=true;setBusy(true);setMessage("Creating test order…");
  try{
   const response=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});
   const order=await response.json();
   if(!response.ok||order.mode!=="test"||!String(order.keyId).startsWith("rzp_test_")||order.currency!=="INR")throw new Error("Checkout is unavailable. Try again later.");
   const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,order_id:order.orderId,name:"LeadFlow AI — TEST",description:"Test payment only; no real charge",modal:{ondismiss:()=>done("Checkout closed. No test access was confirmed.")},handler:async(result)=>{
    setMessage("Verifying test payment on the server…");
    try{
     const response=await fetch("/api/billing/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ledgerOrderId:order.ledgerOrderId,paymentId:result.razorpay_payment_id,signature:result.razorpay_signature})});
     const verified=await response.json();
     if(!response.ok||!["applied","duplicate"].includes(verified.status))throw new Error("Verification pending. Do not pay again; check your test access shortly.");
     const access=await fetch("/api/billing/access",{cache:"no-store"}).then(r=>r.json());
     if(access.active!==true)throw new Error("Test payment received, but access is not confirmed. Please refresh later.");
     done("Test access activated.");router.refresh();
    }catch(error){done(error instanceof Error?error.message:"Verification unavailable. Do not pay again.");}
   }});
   checkout.on("payment.failed",()=>done("Test payment failed. Access was not activated. You can retry checkout."));
   checkout.open();setMessage("Complete the test checkout.");
  }catch(error){done(error instanceof Error?error.message:"Test checkout is unavailable.");}
 }
 return <section className="space-y-4"><Script id="razorpay-test-checkout" src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>setMessage("Checkout script could not load. Please refresh.")}/>
 <p className="rounded border border-amber-500 p-3">TEST MODE ONLY. Use Razorpay test payment details.</p>
 <ul className="space-y-3">{plans.map(plan=><li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-4"><span>{plan.id} · ₹{(plan.amount/100).toFixed(2)} · {plan.durationDays} days of test access</span><button type="button" disabled={!ready||busy} onClick={()=>start(plan.id)} className="rounded border px-4 py-2 disabled:opacity-50">Start test checkout</button></li>)}</ul>
 <p role="status" aria-live="polite">{message}</p></section>;
}
