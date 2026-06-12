import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PublicLeadForm(props: {
  searchParams: Promise<{ success?: string }>;
}) {
  // Yahan humne searchParams ko await kar liya
  const searchParams = await props.searchParams;

  // 1. Agar form submit ho gaya hai, toh Success message dikhao
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

  // 2. Data save karne ka function (Server Action)
  async function submitLead(formData: FormData) {
    "use server";
    const supabase = await createClient();
    
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    // Database mein entry daalo (with your exact user_id)
    const { error } = await supabase.from("leads").insert([
      { 
        name, 
        email, 
        phone, 
        source: "Website Form",
        status: "new", 
        score: 50,
        user_id: "66fbe492-31fd-4034-bd66-ab634eaac313" 
      }
    ]);

    if (error) {
      console.error("Error saving lead:", error);
      return;
    }
    
    // Success hone par URL update kar do
    redirect("/form?success=true");
  }

  // 3. Form ka UI
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