import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { isValidBusinessSlug, validatePublicLead } from "@/lib/public-leads";
import { revalidatePath } from "next/cache";

export default async function DynamicLeadForm(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  // URL se slug nikal rahe hain (e.g., 'cafe-xyz')
  const slug = params.slug;
  if (!isValidBusinessSlug(slug)) notFound();

  // Success UI
  if (searchParams?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center rounded-xl bg-white p-8 shadow-lg max-w-sm">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Thank You!</h2>
          <p className="text-slate-600">Your details have been submitted successfully. We will get back to you soon.</p>
        </div>
      </div>
    );
  }

  // An insert error should be visible to the visitor, never a silent no-op.
  // This route is public by design, and must have separate RLS and spam checks.
  if (searchParams?.error) {
    const invalidDetails = searchParams.error === "invalid";
    const unavailableBusiness = searchParams.error === "business";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#a65d31] p-4">
        <section role="alert" className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
            {invalidDetails ? "Check your details" : unavailableBusiness ? "Form unavailable" : "Submission not saved"}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {invalidDetails
              ? "Some details need correcting."
              : unavailableBusiness
                ? "This business cannot accept enquiries right now."
                : "We couldn\'t save your enquiry."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {invalidDetails
              ? "Enter your full name, a valid email, and a phone number with 10–15 digits. No enquiry was saved."
              : "No enquiry was saved. Please try again later or contact the business directly."}
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

  // Submit Logic (Bina kisi login check ke)
  async function submitLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const validated = validatePublicLead(formData);
    if (!validated.ok) {
      redirect(`/form/${encodeURIComponent(slug)}?error=invalid`);
    }

    // Fail closed for unknown clients. The public SELECT policy for safe
    // slug lookup must be verified with RLS before releasing this change.
    const { data: registeredClient, error: clientError } = await supabase
      .from("clients")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (clientError || !registeredClient) {
      console.error("Public form client lookup unavailable");
      redirect(`/form/${encodeURIComponent(slug)}?error=business`);
    }

    const { name, email, phone } = validated.value;

    // Supabase mein data insert ho raha hai - client_slug ke sath!
    const { error } = await supabase.from("leads").insert([
      { 
        name, 
        email, 
        phone, 
        source: "Website Form",
        status: "new", 
        score: 50,
        client_slug: slug // <--- Ye tera data sahi client ke dashboard mein bhejega
      }
    ]);

    if (error) {
      console.error("Error saving lead:", error);
      redirect(`/form/${encodeURIComponent(slug)}?error=save`);
    }
    
    // Dashboard refresh karo aur success page par bhejo
    revalidatePath("/dashboard");
    redirect(`/form/${slug}?success=true`);
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
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Full Name</label>
            <input required type="text" name="name" className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="John Doe" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Email Address</label>
            <input required type="email" name="email" className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="john@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Phone Number</label>
            <input required type="tel" name="phone" className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="+91 98765 43210" />
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