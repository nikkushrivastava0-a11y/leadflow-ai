"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Script from "next/script";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Backend se Order ID lo
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json();

      if (!data.orderId) {
        toast.error("Order create nahi hua");
        setLoading(false);
        return;
      }

      // 2. Razorpay ka popup setup karo
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Frontend key
        amount: 49900, // ₹499
        currency: "INR",
        name: "LeadFlow AI",
        description: "Pro Plan Upgrade",
        order_id: data.orderId,
        handler: function (response: any) {
          // Payment Success hone pe ye chalega
          toast.success("Payment Successful! Welcome to Pro. 🎉");
          console.log("Payment ID:", response.razorpay_payment_id);
        },
        theme: {
          color: "#4f46e5", // Indigo color match karega
        },
      };

      // 3. Popup open karo
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment fail ho gaya");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Razorpay ka script load karna zaroori hai */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Button 
        onClick={handlePayment} 
        disabled={loading} 
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        <Zap className="mr-2 h-4 w-4" />
        {loading ? "Loading..." : "Upgrade to Pro - ₹499"}
      </Button>
    </>
  );
}