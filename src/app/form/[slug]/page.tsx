import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidClientSlug, validatePublicLead } from "@/lib/public-lead-validation";

export default async function DynamicLeadForm(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  // URL se slug nikal rahe hain (e.g., 'cafe-xyz')
  const slug = params.slug;
  if (!isValidClientSlug(slug)) notFound();

  const errorMessage =
    searchParams.error === "invalid"
      ? "Please enter a valid name, email and phone number."
      : searchParams.error === "unknown"
        ? "This enquiry form is not accepting submissions. Contact the business directly."
        : searchParams.error === "save"
          ? "Your enquiry was not saved. Please try again."
          : null;

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

  // Public server action: never trust browser-side required fields.
  async function submitLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const validation = validatePublicLead({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
    });
    if (!validation.ok) {
      redirect(`/form/${encodeURIComponent(slug)}?error=invalid`);
    }

    // Verify that the submitted slug identifies a real registered client.
    // Database RLS must separately authorize public inserts for that tenant.
    const { data: client, error: lookupError } = await supabase
      .from("clients")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (lookupError || !client) {
      console.error("Public form client could not be verified");
      redirect(`/form/${encodeURIComponent(slug)}?error=unknown`);
    }

    const { name, email, phone } = validation.value;

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
      console.error("Public lead insert failed", error.code);
      redirect(`/form/${encodeURIComponent(slug)}?error=save`);
    }
    
    // Dashboard refresh karo aur success page par bhejo
    revalidatePath("/dashboard");
    redirect(`/form/${encodeURIComponent(slug)}?success=true`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#a65d31] p-4">
      {/* Background color wahi brown rakha hai jo tere screenshot mein tha */}
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Dynamic Title - Form ka naam URL ke hisaab se change hoga */}
        <h1 className="mb-6 text-center text-2xl font-bold text-[#a65d31] capitalize">
          {slug.replace('-', ' ')}
        </h1>
        
        {errorMessage && (
          <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <form action={submitLead} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Full Name</label>
            <input required type="text" name="name" minLength={2} maxLength={100} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="John Doe" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Email Address</label>
            <input required type="email" name="email" maxLength={254} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="john@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[#a65d31]">Phone Number</label>
            <input required type="tel" name="phone" maxLength={24} className="w-full rounded-md border border-[#a65d31] p-2 outline-none focus:ring-2 focus:ring-[#a65d31] transition-colors" placeholder="+91 98765 43210" />
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