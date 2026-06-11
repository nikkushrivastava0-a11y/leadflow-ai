import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Brain, Users, BarChart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 bg-white border-b">
        <h1 className="text-xl font-bold">LeadFlow AI</h1>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="mr-2">Login</Button>
          </Link>
          <Link href="/login">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="flex flex-col items-center justify-center py-20 text-center px-4 flex-grow">
        <h2 className="text-5xl font-extrabold mb-6">Convert more leads with AI.</h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl">
          LeadFlow AI helps you score, manage, and close sales leads faster by using the power of Gemini AI.
        </p>
        <Link href="/login">
          <Button size="lg" className="px-8 py-6 text-lg">Build Your First Pipeline</Button>
        </Link>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="p-6 bg-white rounded-xl border">
            <Brain className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Lead Scoring</h3>
            <p className="text-slate-600">Let Gemini analyze your leads and rank them by intent automatically.</p>
          </div>
          <div className="p-6 bg-white rounded-xl border">
            <Users className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">CRM Dashboard</h3>
            <p className="text-slate-600">Manage all your contacts in one clean, simple, and organized view.</p>
          </div>
          <div className="p-6 bg-white rounded-xl border">
            <BarChart className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Real-time Stats</h3>
            <p className="text-slate-600">Know exactly how many leads are hot and how many are won.</p>
          </div>
        </div>
      </section>
    </div>
  );
}