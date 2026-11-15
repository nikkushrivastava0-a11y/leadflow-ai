import { handleBilling } from "@/lib/server/billing/runtime";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleBilling(request, "verify");
}
