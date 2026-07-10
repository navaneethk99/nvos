import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { instance } from "@/db/schema";
import { auth } from "@/lib/auth";

import { CreateInstanceButton } from "./create-instance-button";
import { SignOutButton } from "./sign-out-button";

function Mark() {
  return (
    <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true">
      <i className="h-2.5 w-[5px] rounded-sm bg-[#b9e7d2]" />
      <i className="h-4 w-[5px] rounded-sm bg-[#b9e7d2]" />
      <i className="h-5 w-[5px] rounded-sm bg-[#b9e7d2]" />
    </span>
  );
}

function NavItem({ active, label }: { active?: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-3 px-3 py-2.5 font-mono text-[11px] tracking-[.12em] ${active ? "bg-[#3973ff] text-white" : "text-[#f4f0e4]/55"}`}>
      <i className={`size-1.5 rounded-full ${active ? "bg-[#f6c95d]" : "bg-[#b9e7d2]/40"}`} />
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const instances = await db
    .select()
    .from(instance)
    .where(eq(instance.userId, session.user.id))
    .orderBy(desc(instance.createdAt));
  const runningInstances = instances.filter(({ status }) => status === "running").length;
  const firstName = session.user.name.split(" ")[0] || "there";

  return (
    <main className="min-h-screen bg-[#f4f0e4] text-[#0d2236] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex bg-[#0d2236] px-5 py-5 text-[#f4f0e4] lg:min-h-screen lg:flex-col lg:px-6 lg:py-7">
        <Link className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]" href="/dashboard">
          <Mark />
          nvos
        </Link>
        <p className="mt-2 hidden font-mono text-[9px] tracking-[.17em] text-[#b9e7d2]/55 lg:block">PERSONAL CLOUD COMPUTE</p>

        <nav className="mt-7 flex gap-2 overflow-x-auto lg:mt-14 lg:block lg:space-y-1" aria-label="Dashboard navigation">
          <NavItem active label="OVERVIEW" />
          <NavItem label="INSTANCES" />
          <NavItem label="ACTIVITY" />
          <NavItem label="BILLING" />
        </nav>

        <div className="ml-auto hidden border-t border-[#b9e7d2]/20 pt-5 lg:mt-auto lg:ml-0 lg:block">
          <p className="font-mono text-[9px] tracking-[.16em] text-[#b9e7d2]/55">SIGNED IN AS</p>
          <p className="mt-2 truncate font-mono text-[11px] text-[#f4f0e4]/80">{session.user.email}</p>
          <SignOutButton className="mt-5 text-[#f4f0e4]/55 hover:text-[#b9e7d2]" />
        </div>
      </aside>

      <section className="min-w-0 bg-[#f4f0e4]">
        <header className="flex items-center justify-between border-b border-[#0d2236]/15 px-5 py-5 sm:px-8 lg:px-10">
          <div>
            <p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">WORKSPACE / OVERVIEW</p>
            <h1 className="mt-1 text-2xl tracking-[-.03em]">Good to see you, {firstName}.</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-[10px] tracking-[.12em] text-[#0d2236]/45 sm:block">SYSTEMS NOMINAL</span>
            <span className="size-2 rounded-full bg-[#3973ff] shadow-[0_0_0_4px_#b9e7d2]" />
            <SignOutButton className="text-[#0d2236]/55 hover:text-[#3973ff] lg:hidden" />
          </div>
        </header>

        <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="border border-[#0d2236]/20 bg-[#17344f] p-5 text-[#f4f0e4]">
              <p className="font-mono text-[10px] tracking-[.15em] text-[#b9e7d2]">RUNNING NOW</p>
              <p className="mt-6 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-5xl leading-none tracking-[-.03em]">{runningInstances.toString().padStart(2, "0")}</p>
              <p className="mt-3 font-mono text-[10px] tracking-wide text-[#f4f0e4]/55">READY FOR CONNECTION</p>
            </article>
            <article className="border border-[#0d2236]/20 bg-[#b9e7d2] p-5">
              <p className="font-mono text-[10px] tracking-[.15em] text-[#0d2236]/60">TOTAL INSTANCES</p>
              <p className="mt-6 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-5xl leading-none tracking-[-.03em]">{instances.length.toString().padStart(2, "0")}</p>
              <p className="mt-3 font-mono text-[10px] tracking-wide text-[#0d2236]/55">YOUR COMPUTE INVENTORY</p>
            </article>
            <article className="border border-[#0d2236]/20 bg-[#f6c95d] p-5">
              <p className="font-mono text-[10px] tracking-[.15em] text-[#0d2236]/60">DEFAULT REGION</p>
              <p className="mt-7 font-mono text-lg font-semibold tracking-tight">ASIA SOUTH</p>
              <p className="mt-4 font-mono text-[10px] tracking-wide text-[#0d2236]/55">LOW-LATENCY ROUTING</p>
            </article>
          </section>

          <section className="mt-8 border border-[#0d2236]/20 bg-white/30">
            <div className="flex flex-col gap-5 border-b border-[#0d2236]/15 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[.15em] text-[#3973ff]">COMPUTE INVENTORY</p>
                <h2 className="mt-1 text-2xl tracking-[-.03em]">Your instances</h2>
              </div>
              <CreateInstanceButton />
            </div>

            {instances.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead className="border-b border-[#0d2236]/15 bg-[#0d2236]/[0.035] font-mono text-[10px] tracking-[.12em] text-[#0d2236]/55">
                    <tr><th className="px-5 py-4 font-normal">INSTANCE</th><th className="px-5 py-4 font-normal">REGION</th><th className="px-5 py-4 font-normal">MACHINE</th><th className="px-5 py-4 font-normal">STATUS</th><th className="px-5 py-4 text-right font-normal">ACTION</th></tr>
                  </thead>
                  <tbody>
                    {instances.map((currentInstance) => (
                      <tr className="border-b border-[#0d2236]/10 last:border-b-0" key={currentInstance.id}>
                        <td className="px-5 py-5"><p className="font-mono text-sm font-semibold">{currentInstance.name}</p><p className="mt-1 font-mono text-[10px] text-[#0d2236]/45">ID / {currentInstance.id.slice(0, 8)}</p></td>
                        <td className="px-5 py-5 font-mono text-xs text-[#0d2236]/70">{currentInstance.region}</td>
                        <td className="px-5 py-5 font-mono text-xs text-[#0d2236]/70">{currentInstance.machineType}</td>
                        <td className="px-5 py-5"><span className="inline-flex items-center gap-2 bg-[#b9e7d2] px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wide"><i className="size-1.5 rounded-full bg-[#3973ff]" />{currentInstance.status.toUpperCase()}</span></td>
                        <td className="px-5 py-5 text-right"><button className="border border-[#0d2236]/30 px-3 py-2 font-mono text-[10px] tracking-[.12em] transition hover:border-[#3973ff] hover:bg-[#3973ff] hover:text-white" type="button">OPEN</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">NO COMPUTE DETECTED</p>
                  <h3 className="mt-3 text-2xl tracking-[-.02em]">Your instance list is empty.</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#0d2236]/60">Create a new instance to add a cloud computer to your inventory.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
