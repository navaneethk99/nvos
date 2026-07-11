"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VmStatus } from "@/db/schema";
import {
  allowedVmActions,
  isTransitionalVmStatus,
  vmStatusBadgeVariant,
  vmStatusLabel,
} from "@/lib/vm-status";

export type PublicVm = {
  id: string;
  name: string;
  description: string | null;
  plan: string | null;
  instanceType: string;
  slug: string;
  hostname: string;
  status: VmStatus;
  failureReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  stoppedAt: Date | string | null;
  terminatedAt: Date | string | null;
  url: string;
};

const instanceSpecs = {
  "t3.micro": "2 vCPU / 1 GiB",
  "t3.small": "2 vCPU / 2 GiB",
  "t3.medium": "2 vCPU / 4 GiB",
  "t3.large": "2 vCPU / 8 GiB",
} as const;

const machinePlans = [
  { value: "micro", name: "Micro", ram: "1 GB RAM" },
  { value: "small", name: "Small", ram: "2 GB RAM" },
  { value: "medium", name: "Medium", ram: "4 GB RAM" },
  { value: "large", name: "Large", ram: "8 GB RAM" },
] as const;

const provisioningMessages = [
  "Spinning up your computer.",
  "Setting up a secure connection.",
  "Preparing the Ubuntu desktop.",
  "Warming up your workspace.",
] as const;

function Badge({ status }: { status: VmStatus }) {
  const variant = vmStatusBadgeVariant(status);
  const color =
    variant === "success"
      ? "bg-[#b9e7d2]"
      : variant === "danger"
        ? "bg-[#f6c95d]"
        : variant === "neutral"
          ? "bg-[#0d2236]/10"
          : "bg-[#3973ff] text-white";
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wide ${color}`}
    >
      <i className="size-1.5 rounded-full bg-current" />
      {vmStatusLabel(status).toUpperCase()}
    </span>
  );
}

export function VmManager({ initialVms }: { initialVms: PublicVm[] }) {
  const router = useRouter();
  const [vms, setVms] = useState(initialVms);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [plan, setPlan] =
    useState<(typeof machinePlans)[number]["value"]>("micro");
  const [pending, setPending] = useState<string | null>(null);
  const [createTransition, setCreateTransition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [provisioningMessageIndex, setProvisioningMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [terminateId, setTerminateId] = useState<string | null>(null);
  const [terminationTransition, setTerminationTransition] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const failures = useRef(0);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const confirmTerminateButtonRef = useRef<HTMLButtonElement>(null);

  function closeModal() {
    if (pending || modalClosing) return;
    setModalClosing(true);
    window.setTimeout(() => {
      setModalOpen(false);
      setModalClosing(false);
    }, 240);
  }

  async function refresh() {
    try {
      const response = await fetch("/api/vms", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { vms: PublicVm[] };
      setVms(data.vms);
      failures.current = 0;
    } catch {
      failures.current += 1;
    }
  }

  const pollingKey = vms
    .filter((vm) => isTransitionalVmStatus(vm.status))
    .map((vm) => `${vm.id}:${vm.status}`)
    .join("|");
  useEffect(() => {
    if (!pollingKey) return;
    let timer: number | undefined;
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void refresh().finally(() => {
        timer = window.setTimeout(
          poll,
          Math.min(5_000 * 2 ** failures.current, 30_000),
        );
      });
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", visibility);
    document.addEventListener("visibilitychange", visibility);
    poll();
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", visibility);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pollingKey]);

  useEffect(() => {
    if (!createTransition) return;
    const interval = window.setInterval(() => {
      setProvisioningMessageIndex(
        (index) => (index + 1) % provisioningMessages.length,
      );
    }, 2_600);
    return () => window.clearInterval(interval);
  }, [createTransition]);

  async function createVm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const buttonBounds = createButtonRef.current?.getBoundingClientRect();
    setProvisioningMessageIndex(0);
    setCreateTransition({
      x: buttonBounds
        ? buttonBounds.left + buttonBounds.width / 2
        : window.innerWidth / 2,
      y: buttonBounds
        ? buttonBounds.top + buttonBounds.height / 2
        : window.innerHeight / 2,
    });
    const startedAt = Date.now();
    setPending("create");
    setError(null);
    try {
      const response = await fetch("/api/vms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, plan }),
      });
      const data = (await response.json()) as { vm?: PublicVm; error?: string };
      if (!response.ok || !data.vm)
        throw new Error(data.error || "The VM request failed.");
      setVms((items) => [data.vm!, ...items]);
      // Keep the transition visible long enough to register, even on a fast local response.
      await new Promise((resolve) =>
        window.setTimeout(resolve, Math.max(0, 700 - (Date.now() - startedAt))),
      );
      setModalOpen(false);
      setName("");
      setDescription("");
      setPlan("micro");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The VM request failed.",
      );
    } finally {
      setCreateTransition(null);
      setPending(null);
    }
  }

  async function mutate(vm: PublicVm, action: "start" | "stop" | "terminate") {
    if (pending) return;
    if (action === "terminate") {
      const buttonBounds =
        confirmTerminateButtonRef.current?.getBoundingClientRect();
      setTerminationTransition({
        name: vm.name,
        x: buttonBounds
          ? buttonBounds.left + buttonBounds.width / 2
          : window.innerWidth / 2,
        y: buttonBounds
          ? buttonBounds.top + buttonBounds.height / 2
          : window.innerHeight / 2,
      });
    }
    setPending(`${vm.id}:${action}`);
    setError(null);
    const url =
      action === "terminate"
        ? `/api/vms/${vm.id}`
        : `/api/vms/${vm.id}/${action}`;
    try {
      const response = await fetch(url, {
        method: action === "terminate" ? "DELETE" : "POST",
      });
      const data = (await response.json()) as { vm?: PublicVm; error?: string };
      if (!response.ok || !data.vm)
        throw new Error(data.error || "The VM request failed.");
      setVms((items) =>
        items.map((item) => (item.id === vm.id ? data.vm! : item)),
      );
      if (action === "terminate") {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
      }
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The VM request failed.",
      );
    } finally {
      setTerminationTransition(null);
      setPending(null);
      setTerminateId(null);
    }
  }

  const visibleVms = vms.filter((vm) => vm.status !== "terminated");
  return (
    <>
      <div className="motion-dashboard-intro mb-8 flex items-end justify-between gap-5">
        <div>
          <p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">
            CLOUD COMPUTE
          </p>
          <h2 className="mt-2 text-4xl tracking-[-.05em]">Your instances</h2>
          <p className="mt-2 text-sm text-[#0d2236]/55">
            Create and manage as many Ubuntu desktops as you need.
          </p>
        </div>
        <button
          className="shrink-0 bg-[#3973ff] px-5 py-3 font-mono text-xs font-semibold tracking-[.1em] text-white transition-colors duration-200 hover:bg-[#255bd5]"
          onClick={() => {
            setError(null);
            setModalClosing(false);
            setModalOpen(true);
          }}
          type="button"
        >
          + NEW INSTANCE
        </button>
      </div>
      {visibleVms.length ? (
        <section className="grid gap-5 xl:grid-cols-2">
          {visibleVms.map((vm) => {
            const actions = allowedVmActions(vm.status);
            return (
              <article
                className="motion-instance-card border border-[#0d2236]/20 bg-white/35"
                key={vm.id}
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#0d2236]/15 p-6">
                  <div className="min-w-0">
                    <h3 className="truncate text-2xl tracking-[-.03em]">
                      {vm.name}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-[#0d2236]/50">
                      {instanceSpecs[
                        vm.instanceType as keyof typeof instanceSpecs
                      ] ?? "Configured by launch template"}{" "}
                      · {vm.hostname}
                    </p>
                  </div>
                  <Badge status={vm.status} />
                </div>
                <div className="p-6">
                  {vm.description ? (
                    <p className="mb-5 text-sm leading-relaxed text-[#0d2236]/65">
                      {vm.description}
                    </p>
                  ) : null}
                  <p className="text-sm text-[#0d2236]/60">
                    {vm.status === "failed"
                      ? vm.failureReason || "Provisioning failed."
                      : isTransitionalVmStatus(vm.status)
                        ? "Applying this instance operation."
                        : vm.status === "stopped"
                          ? "This instance is stopped."
                          : "This Ubuntu desktop is ready."}
                  </p>
                  {isTransitionalVmStatus(vm.status) ? (
                    <div className="mt-5 h-1 overflow-hidden bg-[#0d2236]/10">
                      <div className="h-full w-2/3 animate-pulse bg-[#3973ff]" />
                    </div>
                  ) : null}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {actions.open ? (
                      <a
                        className="bg-[#3973ff] px-4 py-3 font-mono text-[11px] font-semibold tracking-[.1em] text-white"
                        href={vm.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        OPEN DESKTOP
                      </a>
                    ) : null}
                    {actions.start ? (
                      <button
                        className="border border-[#3973ff] px-4 py-3 font-mono text-[11px] text-[#3973ff] disabled:opacity-50"
                        disabled={pending !== null}
                        onClick={() => void mutate(vm, "start")}
                        type="button"
                      >
                        START
                      </button>
                    ) : null}
                    {actions.stop ? (
                      <button
                        className="border border-[#0d2236]/30 px-4 py-3 font-mono text-[11px] disabled:opacity-50"
                        disabled={pending !== null}
                        onClick={() => void mutate(vm, "stop")}
                        type="button"
                      >
                        STOP
                      </button>
                    ) : null}
                    {actions.terminate ? (
                      <button
                        className="border border-[#b24a38]/50 px-4 py-3 font-mono text-[11px] text-[#b24a38] disabled:opacity-50"
                        disabled={pending !== null}
                        onClick={() => setTerminateId(vm.id)}
                        type="button"
                      >
                        TERMINATE
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="border border-dashed border-[#0d2236]/25 px-6 py-14 text-center font-mono text-xs text-[#0d2236]/45">
          NO INSTANCES YET
        </div>
      )}
      {error && !modalOpen ? (
        <p className="mt-5 font-mono text-[11px] text-[#b24a38]">{error}</p>
      ) : null}
      {modalOpen ? (
        <div
          aria-modal="true"
          className={`fixed inset-0 z-50 grid place-items-center bg-[#0d2236]/75 p-5 ${modalClosing ? "motion-modal-backdrop-out" : "motion-modal-backdrop"}`}
          role="dialog"
        >
          <form
            className={`w-full max-w-xl border border-[#0d2236] bg-[#f4f0e4] p-7 shadow-[10px_10px_0_#b9e7d2] sm:p-9 ${modalClosing ? "motion-modal-panel-out" : "motion-modal-panel"}`}
            onSubmit={createVm}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[.16em] text-[#3973ff]">
                  NEW CLOUD COMPUTER
                </p>
                <h3 className="mt-2 text-3xl tracking-[-.04em]">
                  Create an instance
                </h3>
              </div>
              <button
                aria-label="Close dialog"
                className="text-2xl text-[#0d2236]/50"
                disabled={pending !== null}
                onClick={closeModal}
                type="button"
              >
                ×
              </button>
            </div>
            <label className="mt-7 block font-mono text-[10px] tracking-[.12em]">
              INSTANCE NAME
              <input
                autoFocus
                className="mt-2 w-full border border-[#0d2236]/30 bg-white/50 px-4 py-3 text-sm tracking-normal outline-none focus:border-[#3973ff]"
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                placeholder="Design workstation"
                required
                value={name}
              />
            </label>
            <label className="mt-5 block font-mono text-[10px] tracking-[.12em]">
              DESCRIPTION <span className="text-[#0d2236]/40">(OPTIONAL)</span>
              <textarea
                className="mt-2 min-h-24 w-full resize-y border border-[#0d2236]/30 bg-white/50 px-4 py-3 text-sm tracking-normal outline-none focus:border-[#3973ff]"
                maxLength={500}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What will this instance be used for?"
                value={description}
              />
            </label>
            <fieldset className="mt-5">
              <legend className="font-mono text-[10px] tracking-[.12em]">
                MACHINE SIZE
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {machinePlans.map((option) => (
                  <label
                    className={`cursor-pointer border p-3 ${plan === option.value ? "border-[#3973ff] bg-[#b9e7d2]/35" : "border-[#0d2236]/25 bg-white/35"}`}
                    key={option.value}
                  >
                    <input
                      checked={plan === option.value}
                      className="sr-only"
                      name="plan"
                      onChange={() => setPlan(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="block text-sm font-semibold">
                      {option.name}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-[#0d2236]/60">
                      2 vCPU
                    </span>
                    <span className="block font-mono text-[10px] text-[#0d2236]/60">
                      {option.ram}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error ? (
              <p className="mt-4 font-mono text-[11px] text-[#b24a38]">
                {error}
              </p>
            ) : null}
            <div className="mt-7 flex justify-end gap-3">
              <button
                className="border border-[#0d2236]/30 px-5 py-3 font-mono text-xs"
                disabled={pending !== null}
                onClick={closeModal}
                type="button"
              >
                CANCEL
              </button>
              <button
                className="bg-[#3973ff] px-5 py-3 font-mono text-xs font-semibold text-white disabled:opacity-60"
                disabled={pending !== null}
                ref={createButtonRef}
                type="submit"
              >
                CREATE INSTANCE
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {createTransition ? (
        <div
          aria-live="polite"
          className="fixed inset-0 z-[70] overflow-hidden text-[#f4f0e4]"
          role="status"
        >
          <div
            className="motion-create-ripple absolute rounded-full bg-[#0d2236]"
            style={{ left: createTransition.x, top: createTransition.y }}
          />
          <div className="motion-create-content relative flex min-h-full flex-col justify-between p-7 sm:p-10">
            <p className="font-mono text-[10px] tracking-[.18em] text-[#b9e7d2]">
              NVOS / PROVISIONING
            </p>
            <div>
              <p className="font-mono text-[10px] tracking-[.14em] text-[#f4f0e4]/50">
                BUILDING YOUR CLOUD COMPUTER
              </p>
              <div className="mt-4 overflow-hidden">
                <h2
                  aria-atomic="true"
                  className="motion-provisioning-message max-w-2xl text-5xl leading-[.9] tracking-[-.06em] sm:text-7xl"
                  key={provisioningMessageIndex}
                >
                  {provisioningMessages[provisioningMessageIndex]}
                </h2>
              </div>
              <div className="mt-8 h-1 max-w-xl overflow-hidden bg-[#f4f0e4]/20">
                <div className="motion-loading-bar h-full bg-[#b9e7d2]" />
              </div>
            </div>
            <p className="font-mono text-[10px] tracking-[.14em] text-[#f4f0e4]/50">
              THIS MAY TAKE A MOMENT
            </p>
          </div>
        </div>
      ) : null}
      {terminationTransition ? (
        <div
          aria-live="polite"
          className="fixed inset-0 z-[70] overflow-hidden text-[#f4f0e4]"
          role="status"
        >
          <div
            className="motion-terminate-ripple absolute rounded-full bg-[#b24a38]"
            style={{
              left: terminationTransition.x,
              top: terminationTransition.y,
            }}
          />
          <div className="motion-termination-content relative flex min-h-full flex-col justify-between p-7 sm:p-10">
            <p className="font-mono text-[10px] tracking-[.18em] text-[#f6c95d]">
              NVOS / INSTANCE DECOMMISSION
            </p>
            <div>
              <p className="font-mono text-[10px] tracking-[.14em] text-[#f4f0e4]/60">
                TERMINATING INSTANCE
              </p>
              <h2 className="mt-4 max-w-2xl text-5xl leading-[.9] tracking-[-.06em] sm:text-7xl">
                {terminationTransition.name}
              </h2>
              <p className="mt-6 max-w-xl text-sm text-[#f4f0e4]/70">
                Releasing compute and network resources.
              </p>
              <div className="mt-8 h-1 max-w-xl overflow-hidden bg-[#f4f0e4]/25">
                <div className="motion-termination-scan h-full bg-[#f6c95d]" />
              </div>
            </div>
            <p className="font-mono text-[10px] tracking-[.14em] text-[#f4f0e4]/60">
              THIS MAY TAKE A MOMENT
            </p>
          </div>
        </div>
      ) : null}
      {terminateId ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[60] grid place-items-center bg-[#0d2236]/75 p-5"
          role="dialog"
        >
          <div className="w-full max-w-md bg-[#f4f0e4] p-7 shadow-[9px_9px_0_#b24a38]">
            <h3 className="text-3xl tracking-[-.03em]">
              Terminate this instance?
            </h3>
            <p className="mt-4 text-sm text-[#0d2236]/65">
              This cannot be undone and unsaved data may be lost.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="border border-[#0d2236]/30 px-4 py-3 font-mono text-[11px]"
                onClick={() => setTerminateId(null)}
                type="button"
              >
                CANCEL
              </button>
              <button
                className="bg-[#b24a38] px-4 py-3 font-mono text-[11px] text-white"
                onClick={() =>
                  void mutate(
                    vms.find((vm) => vm.id === terminateId)!,
                    "terminate",
                  )
                }
                ref={confirmTerminateButtonRef}
                type="button"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
