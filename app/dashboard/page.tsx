import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getVmConfig } from "@/lib/vm-config";
import { isTransitionalVmStatus } from "@/lib/vm-status";
import { getVmUrl } from "@/lib/vm-status";

import { SignOutButton } from "./sign-out-button";
import { type PublicVm, VmManager } from "./vm-manager";

function Mark() { return <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true"><i className="h-2.5 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-4 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-5 w-[5px] rounded-sm bg-[#b9e7d2]" /></span>; }

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  const vms = await db.select().from(virtualMachine).where(eq(virtualMachine.userId, session.user.id)).orderBy(desc(virtualMachine.createdAt));
  const currentVm = vms.find((vm) => vm.status !== "terminated" && vm.status !== "failed") ?? vms[0] ?? null;
  const firstName = session.user.name.split(" ")[0] || "there";
  const publicVm = currentVm ? { ...currentVm, url: getVmUrl(currentVm.slug, getVmConfig().baseDomain) } : null;
  return <main className="min-h-screen bg-[#f4f0e4] text-[#0d2236] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]"><aside className="flex bg-[#0d2236] px-5 py-5 text-[#f4f0e4] lg:min-h-screen lg:flex-col lg:px-6 lg:py-7"><Link className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]" href="/dashboard"><Mark />nvos</Link><p className="mt-2 hidden font-mono text-[9px] tracking-[.17em] text-[#b9e7d2]/55 lg:block">PERSONAL CLOUD COMPUTE</p><nav className="mt-7 flex gap-2 overflow-x-auto lg:mt-14 lg:block lg:space-y-1" aria-label="Dashboard navigation"><span className="flex items-center gap-3 bg-[#3973ff] px-3 py-2.5 font-mono text-[11px] tracking-[.12em] text-white"><i className="size-1.5 rounded-full bg-[#f6c95d]" />OVERVIEW</span></nav><div className="ml-auto hidden border-t border-[#b9e7d2]/20 pt-5 lg:mt-auto lg:ml-0 lg:block"><p className="font-mono text-[9px] tracking-[.16em] text-[#b9e7d2]/55">SIGNED IN AS</p><p className="mt-2 truncate font-mono text-[11px] text-[#f4f0e4]/80">{session.user.email}</p><SignOutButton className="mt-5 text-[#f4f0e4]/55 hover:text-[#b9e7d2]" /></div></aside><section className="min-w-0 bg-[#f4f0e4]"><header className="flex items-center justify-between border-b border-[#0d2236]/15 px-5 py-5 sm:px-8 lg:px-10"><div><p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">WORKSPACE / OVERVIEW</p><h1 className="mt-1 text-2xl tracking-[-.03em]">Good to see you, {firstName}.</h1></div><SignOutButton className="text-[#0d2236]/55 hover:text-[#3973ff] lg:hidden" /></header><div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><section className="mb-8 grid gap-4 sm:grid-cols-3"><article className="border border-[#0d2236]/20 bg-[#17344f] p-5 text-[#f4f0e4]"><p className="font-mono text-[10px] tracking-[.15em] text-[#b9e7d2]">RUNNING NOW</p><p className="mt-6 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-5xl leading-none">{currentVm?.status === "running" ? "01" : "00"}</p></article><article className="border border-[#0d2236]/20 bg-[#b9e7d2] p-5"><p className="font-mono text-[10px] tracking-[.15em] text-[#0d2236]/60">VM STATUS</p><p className="mt-7 font-mono text-lg font-semibold">{currentVm?.status?.toUpperCase() || "NONE"}</p></article><article className="border border-[#0d2236]/20 bg-[#f6c95d] p-5"><p className="font-mono text-[10px] tracking-[.15em] text-[#0d2236]/60">CONNECTION</p><p className="mt-7 font-mono text-lg font-semibold">{currentVm && isTransitionalVmStatus(currentVm.status) ? "PREPARING" : "BROWSER"}</p></article></section><VmManager initialVm={publicVm as PublicVm | null} /><p className="mt-5 max-w-2xl font-mono text-[10px] leading-relaxed text-[#0d2236]/45">TODO: Random VM subdomains are not access control. Desktop streaming must be protected by authenticated signed cookies, short-lived access tokens, or proxy-level authorization.</p></div></section></main>;
}
