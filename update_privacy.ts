import * as fs from 'fs';

const file = 'App.tsx';
let data = fs.readFileSync(file, 'utf8');

const regex = /\{\s*type === 'privacy'\s*\?\s*<p className="md:pl-6 md:border-l-2 border-transparent">Your debris \(data\) is yours[\s\S]*?<\/p>\s*:\s*<>/;

const replacement = `{type === 'privacy' 
                ? <>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500 font-medium">
                      Your debris (data) is yours. We do not sell your taste to the pedestrian masses. We merely store it in the vault so you may perceive yourself more clearly.
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500">
                      We deeply respect your autonomy and privacy regarding your aesthetic readings. <strong className="font-bold">Your art is never used to train our base machine learning models.</strong>
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-transparent relative group-hover:border-black/20 transition-colors duration-500 font-mono text-[10px] uppercase text-[#666] leading-relaxed p-4 bg-black/[0.02]">
                      <span className="font-bold border-b border-black/10 pb-1 mb-2 block w-fit">[ ON THE SOCIAL FLOOR ]</span>
                      Anchored identities transmit encrypted structural data to the Cloud Registry. We extract <span className="underline decoration-black/20 decoration-dashed underline-offset-4">keyword data from our embedding logic and vectors</span>—not your actual art itself.
                    </p>
                    <p className="md:pl-6 md:border-l-2 border-black/40 italic text-black font-serif text-lg bg-black/5 p-6 shadow-sm border border-black/5">
                      We synthesize these vectors into the 'Social Floor' anonymized trends. This serves as a collective radar: illuminating what is emerging, what resonates strongly across platforms, and providing an ambient pulse to help you generate new creative frameworks around these ideas.
                    </p>
                  </>
                : <>`;

if (regex.test(data)) {
    data = data.replace(regex, replacement);
    fs.writeFileSync(file, data);
    console.log("Successfully replaced Privacy Policy UI in App.tsx!");
} else {
    console.error("Could not find the target string matching the regex. Please check the regex or the file content.");
}
