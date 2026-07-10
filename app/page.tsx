import Link from "next/link";

const workModes = [
  [
    "01",
    "Study mode",
    "A quiet desktop for research, notes, browsing, and the tabs that somehow became a project.",
    "EVERYDAY COMPUTE",
  ],
  [
    "02",
    "Build mode",
    "Scale up for model training, development environments, and work that needs more than your laptop can give.",
    "GPU READY",
  ],
  [
    "03",
    "Make mode",
    "Bring demanding editing, rendering, and design tools to any screen you happen to be using.",
    "CREATIVE POWER",
  ],
];

const details = [
  [
    "Instant",
    "Pick your machine, choose an operating system, and open a fresh desktop in your browser.",
  ],
  [
    "Flexible",
    "Change your compute shape when your work changes. Start small or go full power.",
  ],
  [
    "Fair",
    "The meter runs only while your virtual computer is awake. Pause it whenever you are done.",
  ],
  [
    "Personal",
    "Your environment is yours. Keep your workflow familiar, wherever you sign in.",
  ],
];

function Mark({ light = false }: { light?: boolean }) {
  const color = light ? "bg-[#b9e7d2]" : "bg-[#3973ff]";
  return (
    <span className="flex h-5 w-[22px] items-end gap-[3px]" aria-hidden="true">
      <i className={`h-2.5 w-[5px] rounded-sm ${color}`} />
      <i className={`h-4 w-[5px] rounded-sm ${color}`} />
      <i className={`h-5 w-[5px] rounded-sm ${color}`} />
    </span>
  );
}

function Marquee() {
  const items = Array.from({ length: 8 }, (_, index) => index);
  return (
    <div className="overflow-hidden bg-[#3973ff] text-[#f4f0e4]">
      <div className="flex w-max animate-marquee items-center font-mono text-xs tracking-[.22em] motion-reduce:animate-none">
        {items.map((index) => (
          <div
            className="flex min-h-[48px] shrink-0 items-center gap-6 pr-6"
            key={index}
          >
            <span>YOUR SETUP, ANYWHERE</span>
            <i className="size-2 rounded-full bg-[#f6c95d]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroSystem() {
  return (
    <div
      className="group absolute right-[4vw] top-[18%] z-20 hidden h-[430px] w-[430px] lg:block"
      aria-label="nvos compute chip graphic"
    >
      <div className="absolute left-12 top-6 size-56 rotate-[30deg] border border-[#b9e7d2]/35 bg-[#17344f] transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-2" />
      <div className="absolute left-20 top-14 size-56 rotate-[30deg] bg-[#3973ff] shadow-[13px_15px_0_#f6c95d] transition-transform duration-500 group-hover:translate-x-4 group-hover:-translate-y-4">
        <div className="absolute inset-8 grid place-items-center border-2 border-[#0d2236] bg-[#0d2236] text-center font-mono text-xs tracking-[.18em] text-[#b9e7d2]">
          <span>
            NVOS
            <br />
            <b className="font-normal text-[#f6c95d]">COMPUTE</b>
          </span>
        </div>
        <i className="absolute -left-5 top-5 h-3 w-10 bg-[#b9e7d2]" />
        <i className="absolute -left-5 top-16 h-3 w-10 bg-[#f6c95d]" />
        <i className="absolute -right-5 top-5 h-3 w-10 bg-[#b9e7d2]" />
        <i className="absolute -right-5 top-16 h-3 w-10 bg-[#f6c95d]" />
        <i className="absolute bottom-4 -left-5 h-10 w-3 bg-[#f6c95d]" />
        <i className="absolute bottom-4 -right-5 h-10 w-3 bg-[#b9e7d2]" />
      </div>
      <div className="absolute bottom-4 right-0 w-72 rotate-[-4deg] border border-[#b9e7d2]/55 bg-[#0d2236] p-5 font-mono text-[11px] tracking-wide text-[#f4f0e4] shadow-[9px_9px_0_#3973ff] transition-transform duration-500 group-hover:translate-x-2">
        <div className="mb-6 flex items-center justify-between border-b border-[#b9e7d2]/25 pb-3">
          <span>NVOS / STATUS</span>
          <i className="size-2.5 rounded-full bg-[#b9e7d2]" />
        </div>
        <div className="space-y-2.5 text-[#f4f0e4]/65">
          <p className="flex justify-between">
            <span>REGION</span>
            <b className="font-normal text-[#f6c95d]">READY</b>
          </p>
          <p className="flex justify-between">
            <span>COMPUTE</span>
            <b className="font-normal text-[#b9e7d2]">ON DEMAND</b>
          </p>
        </div>
      </div>
      <div className="absolute left-5 top-[445px] rotate-[-7deg] border border-[#b9e7d2]/55 bg-[#f4f0e4] px-4 py-3 font-mono text-[10px] tracking-wide text-[#0d2236] shadow-[5px_5px_0_#3973ff] transition-transform duration-500 group-hover:-translate-x-2">
        <span className="block text-[#3973ff]">OS SELECTED</span>
        <b className="mt-1 block font-normal">LINUX MINT 22</b>
      </div>
      <div className="absolute right-8 top-[452px] rotate-[12deg] bg-[#f6c95d] p-3 shadow-[5px_5px_0_#0d2236] transition-transform duration-500 group-hover:translate-x-2 group-hover:rotate-[16deg]">
        <div className="grid size-12 place-items-center border-2 border-[#0d2236] font-mono text-[9px] font-bold text-[#0d2236]">
          08
          <br />
          GB
        </div>
        <span className="mt-2 block font-mono text-[8px] tracking-wide text-[#0d2236]">
          MEMORY
        </span>
      </div>
    </div>
  );
}

function MobileSystem() {
  return (
    <div
      className="relative mt-10 h-[190px] w-full max-w-[350px] lg:hidden"
      aria-label="nvos compute chip graphic"
    >
      <div className="absolute left-7 top-2 size-32 rotate-[30deg] bg-[#3973ff] shadow-[8px_9px_0_#f6c95d]">
        <div className="absolute inset-5 grid place-items-center border-2 border-[#0d2236] bg-[#0d2236] text-center font-mono text-[9px] tracking-[.16em] text-[#b9e7d2]">
          NVOS
          <br />
          <span className="text-[#f6c95d]">COMPUTE</span>
        </div>
        <i className="absolute -left-3 top-4 h-2 w-6 bg-[#b9e7d2]" />
        <i className="absolute -right-3 top-4 h-2 w-6 bg-[#f6c95d]" />
        <i className="absolute bottom-3 -left-3 h-6 w-2 bg-[#f6c95d]" />
        <i className="absolute bottom-3 -right-3 h-6 w-2 bg-[#b9e7d2]" />
      </div>
      <div className="absolute right-0 top-5 w-44 rotate-[-4deg] border border-[#b9e7d2]/55 bg-[#0d2236] p-3 font-mono text-[9px] tracking-wide text-[#f4f0e4] shadow-[5px_5px_0_#3973ff]">
        <div className="mb-3 flex items-center justify-between border-b border-[#b9e7d2]/25 pb-2">
          <span>NVOS / STATUS</span>
          <i className="size-1.5 rounded-full bg-[#b9e7d2]" />
        </div>
        <p className="flex justify-between text-[#f4f0e4]/65">
          <span>COMPUTE</span>
          <b className="font-normal text-[#b9e7d2]">READY</b>
        </p>
      </div>
      <div className="absolute bottom-2 left-4 rotate-[-6deg] border border-[#b9e7d2]/55 bg-[#f4f0e4] px-3 py-2 font-mono text-[8px] tracking-wide text-[#0d2236] shadow-[3px_3px_0_#3973ff]">
        <span className="text-[#3973ff]">OS / </span>LINUX MINT
      </div>
      <div className="absolute bottom-0 right-6 rotate-[10deg] bg-[#f6c95d] px-3 py-2 font-mono text-[9px] font-bold text-[#0d2236] shadow-[3px_3px_0_#0d2236]">
        08 GB
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="snap-y snap-mandatory overflow-x-clip bg-[#f4f0e4] font-[ui-serif,Georgia,serif] text-[#0d2236] selection:bg-[#b9e7d2] [&>#how-it-works_article]:gap-2 [&>#how-it-works_article]:py-4 [&>#how-it-works_article_h3]:text-2xl [&>#how-it-works_article_p]:text-sm [&>#how-it-works_article>span:first-child]:font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] [&>#how-it-works_article>span:first-child]:text-2xl md:[&>#how-it-works_article]:gap-4 md:[&>#how-it-works_article]:py-7 md:[&>#how-it-works_article_h3]:text-3xl md:[&>#how-it-works_article_p]:text-base [&>section:nth-of-type(4)_article]:py-4 [&>section:nth-of-type(4)_article_h3]:text-2xl [&>section:nth-of-type(4)_article_p]:text-sm md:[&>section:nth-of-type(4)_article]:py-6 md:[&>section:nth-of-type(4)_article_h3]:text-[28px] md:[&>section:nth-of-type(4)_article_p]:text-base [&>section:nth-of-type(4)]:sticky [&>section:nth-of-type(4)]:top-0 [&>section:nth-of-type(4)]:z-40 [&>section:nth-of-type(5)]:sticky [&>section:nth-of-type(5)]:top-0 [&>section:nth-of-type(5)]:z-50 [&>footer]:relative [&>footer]:z-[60]">
      <section
        id="top"
        className="sticky top-0 z-10 min-h-screen snap-start overflow-hidden bg-[#0d2236] px-5 text-[#f4f0e4] sm:px-8 md:px-[7vw]"
      >
        <nav
          className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 py-5 font-mono text-xs sm:px-8 md:px-[7vw]"
          aria-label="Main navigation"
        >
          <Link
            className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]"
            href="#top"
          >
            <Mark light />
            nvos
          </Link>
          <div className="hidden items-center gap-7 text-[11px] tracking-wide text-[#f4f0e4]/65 md:flex">
            <a className="transition hover:text-[#b9e7d2]" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-[#b9e7d2]" href="#use-cases">
              Use cases
            </a>
            <a className="transition hover:text-[#b9e7d2]" href="#pricing">
              Pricing
            </a>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f0e4] px-4 py-2.5 text-[11px] font-semibold tracking-wide !text-[#0d2236] transition hover:-translate-y-0.5 hover:bg-[#b9e7d2]"
            href="/coming-soon"
          >
            <i className="size-1.5 rounded-full bg-[#3973ff]" />
            LAUNCH
          </Link>
        </nav>

        <HeroSystem />
        <div className="relative z-10 flex flex-col pt-36 md:pt-[145px]">
          <h1 className="max-w-[1000px] font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(100px,24vw,350px)] leading-[.7] tracking-[-.035em]">
            NVOS
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(19px,2vw,27px)] leading-[1.35] text-[#f4f0e4]/85">
            A computer that waits for you, not the other way around.
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[#b7c6d3]">
            Choose the power you need. Pick an operating system. Open your
            workspace from the browser in a few moments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-3 rounded-full bg-[#3973ff] px-6 py-3.5 font-mono text-[13px] font-semibold tracking-wide !text-white transition hover:-translate-y-0.5 hover:bg-[#5889ff]"
              href="/coming-soon"
            >
              BUILD YOUR MACHINE <span className="text-[#f6c95d]">-&gt;</span>
            </Link>
            <a
              className="inline-flex items-center gap-3 rounded-full border border-[#f4f0e4]/45 px-6 py-3.5 font-mono text-[13px] tracking-wide text-[#f4f0e4] transition hover:border-[#b9e7d2] hover:bg-[#b9e7d2]/10"
              href="#how-it-works"
            >
              HOW IT WORKS <span>+</span>
            </a>
          </div>
          <MobileSystem />
        </div>
        <p className="absolute bottom-16 left-5 z-10 font-mono text-[10px] tracking-[.16em] text-[#f4f0e4]/45 sm:left-8 md:bottom-20 md:left-[7vw]">
          NO INSTALLS / NO LONG CONTRACTS / JUST OPEN AND GO
        </p>
        <div className="absolute inset-x-0 bottom-0">
          <Marquee />
        </div>
      </section>

      <section
        id="how-it-works"
        className="sticky top-0 z-20 flex min-h-screen snap-start items-center bg-[#b9e7d2] px-5 py-20 sm:px-8 md:px-[7vw] md:py-32"
      >
        <div className="w-full">
          <div className="mb-16 flex max-w-5xl gap-5 md:gap-10">
            <p className="pt-2 font-mono text-xs font-semibold text-[#3973ff]">
              01
            </p>
            <div>
              <p className="mb-3 font-mono text-[11px] tracking-[.16em] text-[#0d2236]/60">
                A CLEAR STARTING POINT
              </p>
              <h2 className="max-w-3xl font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(52px,8vw,110px)] leading-[.82] tracking-[-.025em]">
                MORE POWER.
                <br />
                <span className="text-[#3973ff]">LESS FRICTION.</span>
              </h2>
            </div>
          </div>
          <div className="border-t border-[#0d2236]/25">
            {workModes.map(([number, title, body, tag]) => (
              <article
                className="grid gap-4 border-b border-[#0d2236]/25 py-7 transition hover:bg-[#0d2236]/5 md:grid-cols-[64px_minmax(170px,1fr)_minmax(260px,2fr)_auto] md:items-baseline md:gap-6"
                key={number}
              >
                <span className="font-mono text-sm text-[#3973ff]">
                  {number}
                </span>
                <h3 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-3xl tracking-wide">
                  {title.toUpperCase()}
                </h3>
                <p className="max-w-xl text-base leading-relaxed text-[#0d2236]/75">
                  {body}
                </p>
                <span className="font-mono text-[10px] tracking-[.12em] text-[#0d2236]/55">
                  {tag}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        className="sticky top-0 z-30 flex min-h-screen snap-start items-center bg-[#f4f0e4] px-5 py-20 sm:px-8 md:px-[7vw] md:py-32"
      >
        <div className="grid w-full gap-12 md:grid-cols-[1.05fr_.95fr] md:gap-20">
          <div>
            <p className="mb-3 font-mono text-[11px] tracking-[.16em] text-[#3973ff]">
              02 / YOUR WAY OF WORKING
            </p>
            <h2 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(52px,7vw,98px)] leading-[.82] tracking-[-.025em]">
              NOT ONE
              <br />
              KIND OF
              <br />
              <span className="text-[#3973ff]">COMPUTER.</span>
            </h2>
            <p className="mt-8 max-w-md text-xl leading-relaxed">
              A desktop is personal. nvos flexes from the light, everyday things
              to the work that makes ordinary machines sweat.
            </p>
          </div>
          <div className="relative mx-auto grid aspect-square w-full max-w-[440px] place-items-center rounded-full border border-[#0d2236]/25">
            <div className="absolute inset-7 rounded-full border border-dashed border-[#3973ff]/50" />
            <div className="relative z-10 w-[72%] rounded-lg bg-[#0d2236] p-4 text-[#f4f0e4] shadow-[12px_12px_0_#3973ff]">
              <div className="mb-8 flex gap-1.5">
                <i className="size-2 rounded-full bg-[#f6c95d]" />
                <i className="size-2 rounded-full bg-[#b9e7d2]" />
                <i className="size-2 rounded-full bg-[#3973ff]" />
              </div>
              <p className="font-mono text-[11px] text-[#b9e7d2]">
                nvos@browser:~$
              </p>
              <p className="mt-2 font-mono text-sm">
                ready for whatever&apos;s next
                <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-[#f6c95d] align-middle" />
              </p>
            </div>
            <span className="absolute -right-3 top-[18%] grid size-20 rotate-12 place-items-center rounded-full bg-[#f6c95d] text-center font-mono text-[10px] leading-tight text-[#0d2236] shadow-[2px_3px_0_#0d2236]">
              PICK A<br />
              POWER
            </span>
            <span className="absolute bottom-[8%] -left-5 grid size-24 rotate-[-10deg] place-items-center rounded-full bg-[#3973ff] text-center font-mono text-[10px] leading-tight text-white shadow-[2px_3px_0_#0d2236]">
              OPEN IT
              <br />
              ANYWHERE
            </span>
          </div>
        </div>
      </section>

      <section className="min-h-screen snap-start bg-[#3973ff] px-5 py-20 text-[#f4f0e4] sm:px-8 md:px-[7vw] md:py-32">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 font-mono text-[11px] tracking-[.16em] text-[#f6c95d]">
            03 / THE GOOD PARTS
          </p>
          <h2 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(52px,7vw,98px)] leading-[.82] tracking-[-.025em]">
            A COMPUTER,
            <br />
            WITHOUT THE
            <br />
            <span className="text-[#b9e7d2]">COMMITMENT.</span>
          </h2>
        </div>
        <div className="grid border-t border-[#f4f0e4]/30 sm:grid-cols-2">
          {details.map(([title, text], index) => (
            <article
              className="border-b border-[#f4f0e4]/30 px-1 py-6 transition hover:bg-[#f4f0e4]/10 sm:px-5"
              key={title}
            >
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-2xl text-[#f6c95d]">
                  0{index + 1}
                </span>
                <h3 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[28px] tracking-wide">
                  {title.toUpperCase()}
                </h3>
              </div>
              <p className="max-w-md text-base leading-relaxed text-[#f4f0e4]/75">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="pricing"
        className="relative flex min-h-screen snap-start items-center overflow-hidden bg-[#f6c95d] px-5 py-24 text-center sm:px-8 md:px-[7vw] md:py-40"
      >
        <div className="absolute -left-20 top-16 size-64 rounded-full border border-[#0d2236]/20" />
        <div className="absolute -bottom-28 -right-12 size-96 rounded-full border border-dashed border-[#0d2236]/25" />
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <p className="mb-4 font-mono text-[11px] tracking-[.16em] text-[#0d2236]/65">
            04 / PAY AS YOU GO
          </p>
          <h2 className="font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-[clamp(60px,10vw,144px)] leading-[.76] tracking-[-.035em]">
            START SMALL.
            <br />
            <span className="text-[#3973ff]">GO FAR.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-xl leading-relaxed text-[#0d2236]/80">
            From $0.09 an hour. There are no plans to decode and no hardware to
            carry around. Run it, pause it, come back when the next idea
            arrives.
          </p>
          <Link
            className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#0d2236] px-7 py-4 font-mono text-[13px] font-semibold tracking-wide !text-[#f4f0e4] shadow-[5px_5px_0_#3973ff] transition hover:-translate-y-0.5 hover:bg-[#17344f]"
            href="/coming-soon"
          >
            SEE WHAT&apos;S COMING <span className="text-[#b9e7d2]">-&gt;</span>
          </Link>
        </div>
      </section>

      <footer className="flex flex-col gap-6 bg-[#0d2236] px-5 py-9 text-[#f4f0e4] sm:px-8 md:flex-row md:items-center md:justify-between md:px-[7vw]">
        <Link
          className="flex items-center gap-2 text-2xl font-bold tracking-[-1.5px]"
          href="#top"
        >
          <Mark light />
          nvos
        </Link>
        <p className="font-mono text-[11px] tracking-wide text-[#f4f0e4]/55">
          CLOUD COMPUTING THAT FEELS HUMAN
        </p>
        <span className="font-mono text-[11px] tracking-[.15em] text-[#b9e7d2]">
          READY WHEN YOU ARE
        </span>
      </footer>
    </main>
  );
}
