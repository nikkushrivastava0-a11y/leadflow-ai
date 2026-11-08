"use client";

import { useState } from "react";

export function FormShareLink({ url }: { url: string }) {
  const [feedback, setFeedback] = useState("");

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(url);
      setFeedback("Link copied. You can paste it wherever you choose.");
    } catch {
      setFeedback("Copy unavailable. Select the link above and copy it manually.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Copy form link
      </button>
      <span role="status" aria-live="polite" className="text-sm text-slate-600">
        {feedback}
      </span>
    </div>
  );
}
