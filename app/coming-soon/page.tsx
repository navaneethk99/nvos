import Link from "next/link";

function Mark() {
  return <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true"><i className="h-2.5 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-4 w-[5px] rounded-sm bg-[#b9e7d2]" /><i className="h-5 w-[5px] rounded-sm bg-[#b9e7d2]" /></span>;
}

export default function ComingSoon() {
  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0d2236] px-7 font-[ui-serif,Georgia,serif] text-[#f4f0e4]">
    <div className="absolute -left-24 top-20 size-80 rounded-full border border-[#b9e7d2]/30" />
    <div className="absolute -right-20 bottom-[-100px] size-[420px] rounded-full border border-dashed border-[#f6c95d]/40" />
    <Link className="absolute left-7 top-7 flex items-center gap-2 text-[25px] font-bold tracking-[-1.5px]" href="/">
      <Mark />nvos
    </Link>
    <section className="relative z-10 max-w-2xl text-center">
      <p className="mb-6 font-mono text-[11px] font-medium tracking-[.18em] text-[#b9e7d2]">COMPUTERS, ON YOUR TERMS</p>
      <h1 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(74px,12vw,160px)] leading-[.76] tracking-[-.045em]">
        WE&apos;RE<br /><span className="text-[#3973ff]">WARMING UP.</span>
      </h1>
      <p className="mx-auto mt-8 max-w-md text-lg leading-relaxed text-[#f4f0e4]/70">
        nvos is getting ready to bring powerful, personal computers to your browser. We&apos;ll be ready soon.
      </p>
      <Link className="mt-9 inline-flex items-center rounded-full bg-[#f4f0e4] px-6 py-3.5 font-mono text-[13px] font-semibold tracking-wide !text-[#0d2236] shadow-[4px_4px_0_#3973ff] transition hover:-translate-y-0.5 hover:bg-[#b9e7d2]" href="/">
        <span className="mr-2 text-[#3973ff]">&larr;</span> Back to nvos
      </Link>
    </section>
  </main>;
}
