import Link from "next/link";

import { GoogleSignInButton } from "./google-sign-in-button";

function Mark() {
  return (
    <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true">
      <i className="h-2.5 w-[5px] rounded-sm bg-[#b9e7d2]" />
      <i className="h-4 w-[5px] rounded-sm bg-[#b9e7d2]" />
      <i className="h-5 w-[5px] rounded-sm bg-[#b9e7d2]" />
    </span>
  );
}

export default function SignInPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#0d2236] px-5 py-7 font-[ui-serif,Georgia,serif] text-[#f4f0e4] sm:px-8 md:px-[7vw]">
      <div className="absolute -left-20 top-[18%] size-72 rounded-full border border-[#b9e7d2]/25" />
      <div className="absolute -right-24 bottom-[-90px] size-[390px] rounded-full border border-dashed border-[#f6c95d]/35" />
      <div className="absolute left-[15%] top-[10%] h-3 w-24 rotate-[-30deg] bg-[#3973ff]" />

      <nav className="relative z-10 flex items-center justify-between" aria-label="Sign in navigation">
        <Link className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]" href="/">
          <Mark />
          nvos
        </Link>
        <Link className="font-mono text-[11px] tracking-wide text-[#f4f0e4]/65 transition hover:text-[#b9e7d2]" href="/">
          &larr; BACK HOME
        </Link>
      </nav>

      <section className="relative z-10 mx-auto flex w-full max-w-md items-center py-16">
        <div className="w-full border border-[#b9e7d2]/35 bg-[#17344f] p-6 shadow-[9px_9px_0_#3973ff] sm:p-9">
          <div className="mb-8 flex items-start justify-between border-b border-[#b9e7d2]/25 pb-5">
            <div>
              <p className="font-mono text-[11px] tracking-[.16em] text-[#b9e7d2]">ACCESS / NVOS</p>
              <h1 className="mt-3 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(54px,11vw,80px)] leading-[.78] tracking-[-.03em]">
                OPEN YOUR<br />
                <span className="text-[#f6c95d]">WORKSPACE.</span>
              </h1>
            </div>
            <span className="mt-1 grid size-9 place-items-center border border-[#b9e7d2]/50 font-mono text-[10px] text-[#b9e7d2]">01</span>
          </div>

          <p className="mb-7 max-w-sm text-base leading-relaxed text-[#f4f0e4]/72">
            Sign in or create your nvos account to keep your computer ready wherever you are.
          </p>
          <GoogleSignInButton />
          <p className="mt-7 text-center font-mono text-[10px] leading-relaxed tracking-wide text-[#f4f0e4]/45">
            BY CONTINUING, YOU AGREE TO RECEIVE ACCESS UPDATES FROM NVOS.
          </p>
        </div>
      </section>

      <p className="relative z-10 self-end font-mono text-[10px] tracking-[.15em] text-[#f4f0e4]/45">
        YOUR SETUP, ANYWHERE / SECURE GOOGLE ACCESS
      </p>
    </main>
  );
}
