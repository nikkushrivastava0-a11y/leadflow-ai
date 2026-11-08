"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

/**
 * Intentionally pause upgrades until the server verifies Razorpay signatures,
 * captured amounts, authenticated order ownership and subscription status.
 *
 * Previous behaviour showed a "payment successful" toast from an unverified
 * browser callback without activating a durable, paid entitlement.
 * Do not re-enable this button as part of cosmetic UI work.
 */
export function UpgradeButton() {
  return (
    <Button
      type="button"
      disabled
      title="Upgrades will be available after payment verification is ready."
      className="bg-slate-200 text-slate-600 opacity-100 cursor-not-allowed"
    >
      <ShieldAlert className="mr-2 h-4 w-4" />
      Pro upgrades temporarily unavailable
    </Button>
  );
}
