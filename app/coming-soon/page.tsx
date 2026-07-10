import Link from "next/link";

function Mark() {
  return <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true"><i className="h-2.5 w-[5px] rounded-sm bg-[#5979ff]" /><i className="h-4 w-[5px] rounded-sm bg-[#5979ff]" /><i className="h-5 w-[5px] rounded-sm bg-[#5979ff]" /></span>;
}

export default function ComingSoon() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f8f6f0] px-7 font-[ui-sans-serif,system-ui,sans-serif] text-[#17202f]">
    <div className="absolute -left-24 top-20 size-80 rounded-full border border-[#c8d3fb]" />
    <div className="absolute -right-20 bottom-[-100px] size-[420px] rounded-full border border-dashed border-[#ffc0b5]" />
    <Link className="absolute left-7 top-7 flex items-center gap-2 text-[25px] font-bold tracking-[-1.5px]" href="/">
      <Mark />nvos
    </Link>
    <section className="relative z-10 max-w-2xl text-center">
      <p className="mb-6 font-mono text-[11px] font-medium tracking-widest text-[#5979ff]">COMPUTERS, ON YOUR TERMS</p>
      <h1 className="text-[clamp(58px,10vw,130px)] font-bold leading-[.86] tracking-[-.075em]">
        We&apos;re<br /><em className="font-[ui-serif,Georgia,serif] font-semibold text-[#fc7866]">warming up.</em>
      </h1>
      <p className="mx-auto mt-8 max-w-md text-base leading-relaxed text-[#5b6470]">
        nvos is getting ready to bring powerful, personal computers to your browser. We&apos;ll be ready soon.
      </p>
      <Link className="mt-9 gap-2 inline-flex items-center rounded-md bg-[#17202f] px-5 py-[15px] text-sm font-semibold !text-white shadow-[4px_4px_0_#c7e65d] transition-colors hover:bg-[#30415f]" href="/">
        <span className="ml-2 text-[#c7e65d]">&larr;</span> Back to nvos
      </Link>
    </section>
  </main>;
}
