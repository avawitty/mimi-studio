import * as fs from 'fs';

const file = 'App.tsx';
let data = fs.readFileSync(file, 'utf8');

const regex = /if \(window\.location\.pathname === '\/privacy' \|\| window\.location\.pathname === '\/terms'\) \{[\s\S]*?<button onClick=\{\(\) => window\.location\.href = '\/'\}.*?<\/button>\s*<\/div>\s*<\/div>\s*\);\s*\}/s;

const replacement = `if (window.location.pathname === '/privacy' || window.location.pathname === '/terms') {
    const type = window.location.pathname === '/privacy' ? 'privacy' : 'terms';
    return (
      <div className="min-h-screen bg-[#18181A] flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden text-nous-base">
        {/* Decorative elements to make it look like a "secret file" examining table */}
        <div className="absolute top-10 left-10 text-[#555] font-mono text-xs uppercase tracking-widest pointer-events-none hidden md:block">MIMI ZINE ARCHIVE</div>
        <div className="absolute top-10 right-10 text-[#555] font-mono text-xs text-right uppercase tracking-widest pointer-events-none hidden md:block">[ REF: REPOSITORY ]<br/>  [ STATUS: ONLINE ]</div>
        
        <div className="absolute bottom-10 left-10 text-[#555] font-mono text-xs uppercase tracking-widest pointer-events-none hidden md:block">SESSION ID: 0X-9921<br/>LATENCY: 12ms</div>
        <div className="absolute bottom-10 right-10 flex items-center gap-3 text-[#555] font-mono text-[10px] uppercase tracking-widest pointer-events-none hidden md:flex"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"/> LIVE CONNECTION</div>
        
        <div className="max-w-4xl w-full relative z-10 rotate-1 group transition-transform hover:rotate-0 duration-700 mt-8 md:mt-0">
          
          {/* Manila Folder Background layer */}
          <div className="absolute -inset-2 md:-inset-4 bg-[#dccca9] rounded-sm shadow-2xl -z-10 rotate-[-2deg] transition-transform group-hover:rotate-0 duration-700 border border-[#bfae8e]" />
          
          {/* File Label Tab */}
          <div className="absolute -top-9 left-2 md:left-8 bg-[#fdfdfb] border border-[#e5e5e5] px-4 py-2 shadow-sm font-mono text-[10px] font-bold tracking-widest uppercase z-10 text-black">
            CONFIDENTIAL
          </div>

          {/* Sticky Note */}
          <div className="absolute top-16 -left-4 md:-left-12 bg-[#f4f2e9] border border-[#e5e0cf] shadow-[2px_4px_10px_rgba(0,0,0,0.1)] p-4 w-36 rotate-[-5deg] z-20 font-mono text-[8px] text-[#4a473f] leading-relaxed mix-blend-multiply opacity-95 overflow-hidden transition-transform group-hover:-rotate-[2deg] duration-500">
             <div className="absolute top-0 right-0 p-1 opacity-20"><Lock size={12}/></div>
             <div className="border-b border-[#4a473f]/20 pb-1 mb-1 font-bold uppercase">System Note</div>
             Scanning complete.<br/>Texture analysis: 98%<br/>Noise profile: High.<br/><br/>
             Ready for audit.<div className="w-4 h-4 rounded-full border border-red-500/50 absolute bottom-2 right-2"/>
          </div>

          <div className="bg-[#fdfdfb] p-8 md:p-16 shadow-[0_10px_50px_rgba(0,0,0,0.3)] relative border-l-4 border-l-[#e4dfd5] text-[#222]">
            
            {/* Top right classification block */}
            <div className="absolute top-8 right-8 border border-black/20 p-2 font-mono flex-col justify-between hidden sm:flex w-48 bg-white/50 backdrop-blur-sm">
              <div className="flex justify-between gap-8 border-b border-black/10 pb-1 mb-1 items-center">
                <span className="text-[7px] font-bold uppercase tracking-widest text-[#222]">ARCHIVE ID</span>
                <span className="text-[8px] uppercase tracking-widest text-[#555]">884-29X</span>
              </div>
              <div className="font-serif italic text-sm text-black py-1">FILE: CLINICAL<br/>ESOTERICISM</div>
              <div className="flex justify-between items-end mt-2 pt-1 border-t border-black/10">
                <span className="text-[7px] text-[#777] uppercase tracking-tight">VOL. 001</span>
                <QrCode size={12} className="opacity-80 text-black" />
              </div>
            </div>

            <h1 className="font-serif text-3xl md:text-5xl italic mb-10 text-black max-w-[70%]">{type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h1>
            
            <div className="font-sans text-[#333] text-sm md:text-base leading-relaxed mb-8 flex flex-col gap-6 max-w-2xl relative">
              {/* Vertical line overlay indicating a timeline/document marginalia */}
              <div className="hidden md:block absolute -left-6 top-0 bottom-0 w-px bg-black/10" />
              
              {type === 'privacy' 
                ? <p className="md:pl-6 md:border-l-2 border-transparent">Your debris (data) is yours. We do not sell your taste to the pedestrian masses. We merely store it in the vault so you may perceive yourself more clearly. Anchored identities (Google Auth) transmit data to the Cloud Registry. This data is encrypted and used solely for your personal archive and collective 'Social Floor' anonymized trends.</p>
                : <>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500 font-medium">
                      You are responsible for the debris you manifest. Mimi is an editor, not a censor, but we decree that violence and harm are aesthetically wretched and grounds for vault suspension.
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500">
                      Our <span className="underline decoration-black/20 decoration-wavy underline-offset-4">sovereign intention</span> is the boundless expansion of your self-expression and creative liberty. You are not meant to feel limited, boxed in, or narrowly defined by algorithmic cages. This is a callithumpian playground for your most authentic refractions to sprawl, shift, and evolve freely.
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500 font-mono text-[10px] uppercase text-[#666] leading-relaxed p-4 bg-black/[0.02]">
                      <span className="font-bold border-b border-black/10 pb-1 mb-2 block w-fit">[ SYSTEM ANNOTATION ]</span>
                      Speaking of untamed artifacts, you are welcome to upload your chaotic UI states to the ether. We understand that traditional terms of service are inherently spooky and laden with phantom bureaucracy. Here, the only rule is creative audacity, minus the malice.
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-black/40 italic text-black font-serif text-xl bg-black/5 p-6 shadow-sm border border-black/5">
                      You own your refractions. Mimi owns the machine that refines them.<br/><br/>It is a partnership of velvet and logic.
                    </p>
                  </>
              }
            </div>

            {/* Signature Area */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end mt-16 pt-8 border-t border-black/10 gap-6">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[#555] leading-tight">
                END OF RECORD.<br/>CONFIRM AND SEAL.
              </div>
              <button onClick={() => window.location.href = '/'} className="relative group/btn font-mono text-[10px] uppercase tracking-widest font-bold text-black border border-black/20 px-8 py-3 hover:bg-black hover:text-white transition-colors overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-3">Return to Vault <ArrowRight size={12}/></span>
              </button>
            </div>
            
          </div>
        </div>

        {/* Floating text decoration on the right side */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-12 font-mono text-[9px] text-[#555] uppercase tracking-[0.3em] origin-right -rotate-90 pointer-events-none hidden xl:flex">
          <span className="opacity-100 mix-blend-difference">01 _AUDIT</span>
          <span className="opacity-100 mix-blend-difference">02 _CALIBRATE</span>
          <span className="opacity-100 mix-blend-difference">03 _DISTRIBUTE</span>
        </div>

      </div>
    );
  }`;

if (regex.test(data)) {
    data = data.replace(regex, replacement);
    fs.writeFileSync(file, data);
    console.log("Successfully replaced Terms of Service UI in App.tsx!");
} else {
    console.error("Could not find the target string matching the regex. Please check the regex or the file content.");
}
