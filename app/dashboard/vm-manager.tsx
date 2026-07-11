"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VmStatus } from "@/db/schema";
import { allowedVmActions, isTransitionalVmStatus, vmStatusBadgeVariant, vmStatusLabel } from "@/lib/vm-status";

export type PublicVm = {
  id: string; slug: string; hostname: string; status: VmStatus; failureReason: string | null;
  createdAt: Date | string; updatedAt: Date | string; stoppedAt: Date | string | null; terminatedAt: Date | string | null; url: string;
};

function Badge({ status }: { status: VmStatus }) {
  const color = vmStatusBadgeVariant(status) === "success" ? "bg-[#b9e7d2]" : vmStatusBadgeVariant(status) === "danger" ? "bg-[#f6c95d]" : vmStatusBadgeVariant(status) === "neutral" ? "bg-[#0d2236]/10" : "bg-[#3973ff] text-white";
  return <span className={`inline-flex items-center gap-2 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wide ${color}`}><i className="size-1.5 rounded-full bg-current" />{vmStatusLabel(status).toUpperCase()}</span>;
}

export function VmManager({ initialVm }: { initialVm: PublicVm | null }) {
  const router = useRouter();
  const [vm, setVm] = useState(initialVm);
  const [pending, setPending] = useState<"create" | "start" | "stop" | "terminate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmTermination, setConfirmTermination] = useState(false);
  const failures = useRef(0);

  async function refresh() {
    try {
      const response = await fetch("/api/vms", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { vms: PublicVm[] };
      const selected = data.vms.find((item) => item.status !== "terminated" && item.status !== "failed") ?? data.vms[0] ?? null;
      if (selected && selected.status !== "terminated") {
        const detailResponse = await fetch(`/api/vms/${selected.id}`, { cache: "no-store" });
        if (detailResponse.ok) {
          const detail = await detailResponse.json() as { vm: PublicVm };
          setVm(detail.vm);
        } else setVm(selected);
      } else setVm(selected);
      failures.current = 0;
    } catch { failures.current += 1; }
  }

  useEffect(() => {
    if (!vm || (!isTransitionalVmStatus(vm.status) && vm.status !== "failed")) return;
    let timer: number | undefined;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void refresh().finally(() => { timer = window.setTimeout(poll, Math.min(5_000 * (2 ** failures.current), 30_000)); });
    };
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visibility);
    document.addEventListener("visibilitychange", visibility);
    if (vm.status === "failed") {
      const recheck = window.setTimeout(() => void refresh(), 0);
      return () => {
        window.clearTimeout(recheck);
        window.removeEventListener("focus", visibility);
        document.removeEventListener("visibilitychange", visibility);
      };
    }
    poll();
    return () => { if (timer) window.clearTimeout(timer); window.removeEventListener("focus", visibility); document.removeEventListener("visibilitychange", visibility); };
  // The interval is intentionally reset only when the selected VM or its state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm?.id, vm?.status]);

  async function mutate(action: "create" | "start" | "stop" | "terminate") {
    if (pending || (action !== "create" && !vm)) return;
    setPending(action); setError(null);
    const url = action === "create" ? "/api/vms" : action === "terminate" ? `/api/vms/${vm!.id}` : `/api/vms/${vm!.id}/${action}`;
    try {
      const response = await fetch(url, { method: action === "terminate" ? "DELETE" : "POST" });
      const data = await response.json() as { vm?: PublicVm; error?: string };
      if (!response.ok) throw new Error(data.error || "The VM request failed.");
      if (data.vm) setVm(data.vm);
      await refresh(); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The VM request failed."); }
    finally { setPending(null); setConfirmTermination(false); }
  }

  if (!vm || vm.status === "terminated") return <section className="border border-[#0d2236]/20 bg-white/30 p-6 sm:p-8"><p className="font-mono text-[10px] tracking-[.15em] text-[#3973ff]">PERSONAL CLOUD COMPUTER</p><h2 className="mt-2 text-3xl tracking-[-.03em]">Launch your Ubuntu desktop.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-[#0d2236]/60">We will prepare one browser-accessible Ubuntu VM and assign it a readable address.</p><button className="mt-6 bg-[#3973ff] px-5 py-3 font-mono text-xs font-semibold tracking-wide text-white disabled:cursor-wait disabled:opacity-70" disabled={pending !== null} onClick={() => void mutate("create")} type="button">{pending === "create" ? "LAUNCHING..." : "LAUNCH VM"}</button>{error ? <p className="mt-4 font-mono text-[11px] text-[#b24a38]">{error}</p> : null}</section>;

  const actions = allowedVmActions(vm.status);
  return <section className="border border-[#0d2236]/20 bg-white/30"><div className="flex flex-col gap-4 border-b border-[#0d2236]/15 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] tracking-[.15em] text-[#3973ff]">YOUR CLOUD COMPUTER</p><h2 className="mt-1 text-3xl tracking-[-.03em]">{vm.slug}</h2><p className="mt-2 font-mono text-xs text-[#0d2236]/55">{vm.hostname}</p></div><Badge status={vm.status} /></div><div className="p-6"><p className="text-sm leading-relaxed text-[#0d2236]/65">{vm.status === "provisioning" || vm.status === "starting" ? "Preparing your cloud computer." : vm.status === "terminating" ? "Terminating your cloud computer." : vm.status === "failed" ? (vm.failureReason || "The VM could not be prepared.") : vm.status === "stopped" ? "Your cloud computer is stopped." : "Your cloud computer is ready for connection."}</p>{isTransitionalVmStatus(vm.status) ? <div className="mt-5 h-1 overflow-hidden bg-[#0d2236]/10"><div className="h-full w-2/3 animate-pulse bg-[#3973ff]" /></div> : null}<div className="mt-6 flex flex-wrap gap-3">{actions.open ? <a className="bg-[#3973ff] px-4 py-3 font-mono text-[11px] font-semibold tracking-[.12em] text-white" href={vm.url} rel="noopener noreferrer" target="_blank">OPEN DESKTOP</a> : null}{vm.status === "failed" ? <button className="bg-[#3973ff] px-4 py-3 font-mono text-[11px] font-semibold tracking-[.12em] text-white disabled:opacity-60" disabled={pending !== null} onClick={() => void mutate("create")} type="button">CREATE NEW VM</button> : null}{actions.start ? <button className="border border-[#3973ff] px-4 py-3 font-mono text-[11px] tracking-[.12em] text-[#3973ff] disabled:opacity-60" disabled={pending !== null} onClick={() => void mutate("start")} type="button">{pending === "start" ? "STARTING..." : "START"}</button> : null}{actions.stop ? <button className="border border-[#0d2236]/30 px-4 py-3 font-mono text-[11px] tracking-[.12em] disabled:opacity-60" disabled={pending !== null} onClick={() => void mutate("stop")} type="button">{pending === "stop" ? "STOPPING..." : "STOP"}</button> : null}{actions.terminate ? <button className="border border-[#b24a38]/50 px-4 py-3 font-mono text-[11px] tracking-[.12em] text-[#b24a38] disabled:opacity-60" disabled={pending !== null} onClick={() => setConfirmTermination(true)} type="button">TERMINATE</button> : null}</div>{error ? <p className="mt-4 font-mono text-[11px] text-[#b24a38]">{error}</p> : null}</div>{confirmTermination ? <div aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center bg-[#0d2236]/70 p-5" role="dialog"><div className="w-full max-w-md border border-[#b24a38]/60 bg-[#f4f0e4] p-7 shadow-[9px_9px_0_#b24a38]"><p className="font-mono text-[10px] tracking-[.16em] text-[#b24a38]">VM / TERMINATION</p><h3 className="mt-3 text-3xl tracking-[-.03em]">Terminate this VM?</h3><p className="mt-4 text-sm leading-relaxed text-[#0d2236]/70">This VM will be permanently terminated. Unsaved VM data may be lost and this action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button className="border border-[#0d2236]/30 px-4 py-3 font-mono text-[11px] tracking-[.12em]" disabled={pending !== null} onClick={() => setConfirmTermination(false)} type="button">CANCEL</button><button className="bg-[#b24a38] px-4 py-3 font-mono text-[11px] font-semibold tracking-[.12em] text-white disabled:opacity-60" disabled={pending !== null} onClick={() => void mutate("terminate")} type="button">{pending === "terminate" ? "TERMINATING..." : "CONFIRM TERMINATION"}</button></div></div></div> : null}</section>;
}
