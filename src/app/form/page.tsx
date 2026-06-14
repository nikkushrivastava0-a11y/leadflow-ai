import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache"; // <-- Ye Next.js ka cache-killer hai

export default async function PublicLeadForm(props: {
  searchParams: Promise<{ success?: string }>;
}) {
  const searchParams = await props.searchParams;

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

  async function submitLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const { error } = await supabase.from("leads").insert([
      { 
        name, 
        email, 
        phone, 
        source: "Website Form",
        status: "new", 
        score: 50,
        user_id: "56fbe492-31fd-4034-bd65-ab634aeac313"
      }
    ]);

    if (error) {
      console.error("Error saving lead:", error);
      return;
    }
    
    // NAYA CODE: Dashboard ka cache turant uda do
    revalidatePath("/dashboard");
    
    redirect("/form?success=true");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-slate-800">Contact Us</h1>
        <form action={submitLead} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input required type="text" name="name" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:border-indigo-500 transition-colors" placeholder="John Doe" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
            <input required type="email" name="email" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:border-indigo-500 transition-colors" placeholder="john@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
            <input required type="tel" name="phone" className="w-full rounded-md border border-slate-300 p-2 outline-none focus:border-indigo-500 transition-colors" placeholder="+91 98765 43210" />
          </div>
          <button type="submit" className="mt-4 w-full rounded-md bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 font-semibold transition-colors">
            Submit Details
          </button>
        </form>
      </div>
    </div>
  );
}