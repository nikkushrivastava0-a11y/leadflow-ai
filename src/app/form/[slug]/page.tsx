import { createPublicSubmissionClient } from "@/lib/server/public-submission-client";
import { notFound, redirect } from "next/navigation";
import { isValidBusinessSlug, validatePublicLead } from "@/lib/public-leads";
import { reservePublicLeadSubmission } from "@/lib/server/public-lead-guard";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createEnquiryReceipt, verifyEnquiryReceipt, ENQUIRY_RECEIPT_COOKIE, ENQUIRY_RECEIPT_SECONDS } from "@/lib/server/public-enquiry-receipt";

function intakeEnabled() {
  return process.env.PUBLIC_ENQUIRIES_ENABLED === "true";
}

export default async function DynamicLeadForm(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  // URL se slug nikal rahe hain (e.g., 'cafe-xyz')
  const slug = params.slug;
  if (!isValidBusinessSlug(slug)) notFound();

  // A query parameter alone never proves the server saved an enquiry.
  if (searchParams?.success) {
    const receipt = (await cookies()).get(ENQUIRY_RECEIPT_COOKIE)?.value;
    const confirmed = verifyEnquiryReceipt(receipt, slug, process.env.LEAD_GUARD_HASH_SECRET);
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center rounded-xl bg-white p-8 shadow-lg max-w-sm">
          <div className="text-4xl mb-4" aria-hidden="true">{confirmed ? "✓" : "?"}</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">{confirmed ? "Enquiry saved" : "Submission status unavailable"}</h2>
          <p className="text-slate-600">{confirmed ? "Your enquiry was saved. The business can review it in its workspace." : "This page cannot confirm a saved enquiry. Contact the business if you are unsure before submitting again."}</p>
        </div>
      </div>
    );
  }

  // An insert error should be visible to the visitor, never a silent no-op.
  // This route is public by design, and must have separate RLS and spam checks.
  if (searchParams?.error) {
    const invalidDetails = searchParams.error === "invalid";
    const unavailableBusiness = searchParams.error === "business";
    const slowDown = searchParams.error === "busy";
    const duplicate = searchParams.error === "duplicate";
    const guardUnavailable = searchParams.error === "guard";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#a65d31] p-4">
        <section role="alert" className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            {invalidDetails ? "Check your details" : unavailableBusiness ? "Form unavailable" : slowDown ? "Too many requests" : duplicate ? "Recent similar enquiry" : guardUnavailable ? "Temporarily unavailable" : "Submission not saved"}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {invalidDetails
              ? "Some details need correcting."
              : unavailableBusiness
                ? "This business cannot accept enquiries right now."
                : slowDown
                  ? "Please try again later."
                  : duplicate
                    ? "A similar enquiry was attempted recently."
                    : guardUnavailable
                      ? "The enquiry form is temporarily unavailable."
                      : "We couldn't save your enquiry."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {invalidDetails
              ? "Enter your full name, a valid email, and a phone number with 10–15 digits. No enquiry was saved."
              : slowDown
                ? "Too many enquiries were attempted in a short period. Wait before submitting again."
                : duplicate
                  ? "A similar enquiry was attempted recently. Check with the business before submitting again."
                  : "No enquiry was saved or confirmed. Please try again later or contact the business directly."}
          </p>
          <a
            href={`/form/${encodeURIComponent(slug)}`}
            className="mt-6 inline-flex rounded-md bg-[#a65d31] px-5 py-3 text-sm font-semibold text-white"
          >
            Try again
          </a>
        </section>
      </main>
    );
  }

  // Public action: validated input, shared rate guard, server-only DB writer.
  async function submitLead(formData: FormData) {
    "use server";
    if (!intakeEnabled()) redirect(`/form/${encodeURIComponent(slug)}?error=guard`);
    const validated = validatePublicLead(formData);
    if (!validated.ok) {
      redirect("/form/" + encodeURIComponent(slug) + "?error=invalid");
    }

    const { name, email, phone } = validated.value;

    // An anonymous browser key must NOT be able to insert straight into
    // public.leads after RLS hardening. Enforce the Redis guard before using
    // an elevated server-only Supabase secret key.
    const reservation = await reservePublicLeadSubmission({
      slug,
      name,
      email,
      phone,
      honeypot: formData.get("company_website"),
    });

    if (!reservation.allowed) {
      const errorState =
        reservation.reason === "rate_limited" ? "busy" :
        reservation.reason === "duplicate" ? "duplicate" :
        reservation.reason === "spam" ? "invalid" : "guard";
      redirect("/form/" + encodeURIComponent(slug) + "?error=" + errorState);
    }

    const supabase = createPublicSubmissionClient();
    if (!supabase) {
      await reservation.release();
      redirect("/form/" + encodeURIComponent(slug) + "?error=guard");
    }

    // Only the verified business slug, never owner_email or private client
    // fields, is returned. A failure releases the reservation for retry.
    let businessExists = false;
    try {
      const { data: registeredClient, error: clientError } = await supabase
        .from("clients")
        .select("slug, owner_user_id")
        .eq("slug", slug)
        .maybeSingle();

      businessExists = !clientError && registeredClient?.slug === slug && Boolean(registeredClient?.owner_user_id);
    } catch {
      console.error("Public form business lookup failed");
    }

    if (!businessExists) {
      await reservation.release();
      redirect("/form/" + encodeURIComponent(slug) + "?error=business");
    }

    // The reservation prevents rapid duplicates during a DB write.
    // Without a unique DB constraint, this is NOT an exactly-once guarantee.
    let insertFailed = false;
    try {
      const { error } = await supabase.from("leads").insert([{
        name,
        email,
        phone,
        source: "Website Form",
        status: "new",
        score: 50,
        score_reason: "Unscored enquiry (AI analysis has not run).",
        client_slug: slug,
      }]);
      if (error) {
        console.error("Public enquiry insert failed:", error.code || "unknown");
        insertFailed = true;
      }
    } catch {
      console.error("Public enquiry insert threw an error");
      insertFailed = true;
    }

    if (insertFailed) {
      await reservation.release();
      redirect("/form/" + encodeURIComponent(slug) + "?error=save");
    }

    const committed = await reservation.complete();
    if (!committed) {
      // A durable DB insert already succeeded. Do not pretend it failed.
      console.warn("Public lead saved but duplicate guard confirmation unavailable");
    }

    const receipt = createEnquiryReceipt(slug, process.env.LEAD_GUARD_HASH_SECRET);
    if (receipt) {
      (await cookies()).set(ENQUIRY_RECEIPT_COOKIE, receipt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/form/${slug}`,
        maxAge: ENQUIRY_RECEIPT_SECONDS,
      });
    }

    // Refresh the owner workspace only after the database accepted the insert.
    revalidatePath("/dashboard");
    redirect(`/form/${encodeURIComponent(slug)}?success=true`);
  }

  // Keep intake closed until the coordinated database/auth release is approved.
  // Recheck inside the action too: stale pages cannot bypass this gate.
  if (!intakeEnabled() || !createPublicSubmissionClient()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <section role="status" className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Enquiry form unavailable</h1>
          <p className="mt-3 text-slate-700">This business is not accepting online enquiries yet. Please contact the business directly.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#a65d31] p-4">
      {/* Background color wahi brown rakha hai jo tere screenshot mein tha */}
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Dynamic Title - Form ka naam URL ke hisaab se change hoga */}
        <h1 className="mb-6 text-center text-2xl font-bold text-[#a65d31] capitalize">
          {slug.replace('-', ' ')}
        </h1>
        
        <form action={submitLead} className="flex flex-col gap-4">
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="company_website">Do not fill out this field</label>
            <input
              id="company_website"
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-[#a65d31]">Full Name</label>
            <input required id="lead-name" type="text" name="name" autoComplete="name" maxLength={100} minLength={2} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="John Doe" />
          </div>
          <div>
            <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-[#a65d31]">Email Address</label>
            <input required id="lead-email" type="email" name="email" autoComplete="email" maxLength={254} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="john@example.com" />
          </div>
          <div>
            <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium text-[#a65d31]">Phone Number</label>
            <input required id="lead-phone" type="tel" name="phone" autoComplete="tel" maxLength={25} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="+91 98765 43210" />
          </div>
          <button type="submit" className="mt-4 w-full rounded-md bg-[#a65d31] p-2.5 text-white hover:bg-[#8a4b26] font-semibold transition-colors">
            Submit
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Powered by LeadFlow AI</p>
        </form>
      </div>
    </div>  
  );
}