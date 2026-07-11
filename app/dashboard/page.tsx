import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { auth } from "@/lib/auth";
import { publicVm } from "@/lib/vm-route";

import { SignOutButton } from "./sign-out-button";
import { type PublicVm, VmManager } from "./vm-manager";

function Mark() { return <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true"><i className="h-2.5 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-4 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-5 w-[5px] rounded-sm bg-[#b9e7d2]" /></span>; }

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const vms = await db.select().from(virtualMachine).where(eq(virtualMachine.userId, session.user.id)).orderBy(desc(virtualMachine.createdAt));
  const firstName = session.user.name.split(" ")[0] || "there";
  return <main className="min-h-screen bg-[#f4f0e4] text-[#0d2236] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]"><aside className="flex bg-[#0d2236] px-5 py-5 text-[#f4f0e4] lg:min-h-screen lg:flex-col lg:px-6 lg:py-7"><Link className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]" href="/dashboard"><Mark />nvos</Link><p className="mt-2 hidden font-mono text-[9px] tracking-[.17em] text-[#b9e7d2]/55 lg:block">PERSONAL CLOUD COMPUTE</p><nav className="mt-7 flex gap-2 overflow-x-auto lg:mt-14 lg:block lg:space-y-1" aria-label="Dashboard navigation"><span className="flex items-center gap-3 bg-[#3973ff] px-3 py-2.5 font-mono text-[11px] tracking-[.12em] text-white"><i className="size-1.5 rounded-full bg-[#f6c95d]" />OVERVIEW</span></nav><div className="ml-auto hidden border-t border-[#b9e7d2]/20 pt-5 lg:mt-auto lg:ml-0 lg:block"><p className="font-mono text-[9px] tracking-[.16em] text-[#b9e7d2]/55">SIGNED IN AS</p><p className="mt-2 truncate font-mono text-[11px] text-[#f4f0e4]/80">{session.user.email}</p><SignOutButton className="mt-5 text-[#f4f0e4]/55 hover:text-[#b9e7d2]" /></div></aside><section className="min-w-0"><header className="flex items-center justify-between border-b border-[#0d2236]/15 px-5 py-5 sm:px-8 lg:px-10"><div><p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">WORKSPACE / OVERVIEW</p><h1 className="mt-1 text-2xl tracking-[-.03em]">Good to see you, {firstName}.</h1></div><SignOutButton className="text-[#0d2236]/55 hover:text-[#3973ff] lg:hidden" /></header><div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><VmManager initialVms={vms.map(publicVm) as PublicVm[]} /><p className="mt-5 max-w-2xl font-mono text-[10px] leading-relaxed text-[#0d2236]/45">TODO: Desktop streaming must be protected by authenticated proxy-level authorization.</p></div></section></main>;
}
