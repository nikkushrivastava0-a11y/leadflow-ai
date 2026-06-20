import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function DynamicLeadForm(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  // URL se slug nikal rahe hain (e.g., 'cafe-xyz')
  const slug = params.slug;

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

  // Submit Logic (Bina kisi login check ke)
  async function submitLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

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
      return;
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