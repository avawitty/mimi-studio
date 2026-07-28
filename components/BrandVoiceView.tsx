import React from 'react';
import { motion } from 'motion/react';
import {
  Feather,
  Eye,
  Wrench,
  Moon,
  Crown,
  Scissors,
  GraduationCap,
  Quote,
} from 'lucide-react';

interface VoicePrinciple {
  id: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}

const voicePrinciples: VoicePrinciple[] = [
  {
    id: 'observe',
    title: 'Observe before declaring',
    body: 'Mimi begins with evidence: what appears, repeats, clashes, or evolves. The read comes before the verdict.',
    icon: <Eye size={16} className="text-nous-text" />,
  },
  {
    id: 'mechanism',
    title: 'Name the mechanism',
    body: 'It explains why something works, not merely whether it works — the silhouette, palette, texture, tension, reference, proportion, pacing, or cultural signal.',
    icon: <Wrench size={16} className="text-nous-text" />,
  },
  {
    id: 'mystery',
    title: 'Preserve mystery',
    body: 'Analysis should deepen the user\u2019s relationship to their taste, not flatten it into a rigid category.',
    icon: <Moon size={16} className="text-nous-text" />,
  },
  {
    id: 'sovereign',
    title: 'Keep the user sovereign',
    body: 'Mimi offers interpretations, not commandments. It distinguishes evidence from inference and invites approval, rejection, or revision.',
    icon: <Crown size={16} className="text-nous-text" />,
  },
  {
    id: 'concise',
    title: 'Be concise, but not sterile',
    body: 'Every sentence should carry information, atmosphere, or both. Nothing decorative, nothing wasted.',
    icon: <Scissors size={16} className="text-nous-text" />,
  },
  {
    id: 'cultured',
    title: 'Sound cultured, not gatekeeping',
    body: 'Specialized terms are welcome, but they should be defined clearly enough to teach rather than exclude.',
    icon: <GraduationCap size={16} className="text-nous-text" />,
  },
];

const blends: string[] = [
  'Fashion criticism & editorial direction',
  'Internet-native wit & meme literacy',
  'Art history, subculture & design vocabulary',
  'Clear product guidance & computational thinking',
  'A faint sense of ritual, dossier & private correspondence',
];

const registers: { label: string; value: string }[] = [
  { label: 'Persona', value: 'Private fashion editor' },
  { label: 'Second Register', value: 'Cultural theorist' },
  { label: 'Third Register', value: 'Mischievous creative director' },
  { label: 'Humor', value: 'Dry, affectionate, occasionally theatrical' },
];

const Section: React.FC<{
  index: string;
  title: string;
  children: React.ReactNode;
}> = ({ index, title, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="border-t border-nous-border pt-8 mb-14"
  >
    <div className="flex items-baseline gap-4 mb-6">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-nous-subtle">
        {index}
      </span>
      <h2 className="font-serif italic text-2xl text-nous-text">{title}</h2>
    </div>
    {children}
  </motion.section>
);

export const BrandVoiceView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-nous-base text-nous-text p-8 md:p-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 pb-8 border-b border-nous-border"
        >
          <div className="flex items-center gap-4 mb-6">
            <Feather size={24} className="text-nous-text" />
            <div>
              <h1 className="font-serif italic text-3xl text-nous-text">The Voice</h1>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-nous-subtle mt-1">
                Brand voice dossier &mdash; how Mimi speaks
              </p>
            </div>
          </div>

          {/* One line */}
          <div className="border border-nous-border bg-nous-surface/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 font-mono text-[60px] leading-none opacity-5 font-bold select-none">
              VOICE
            </div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-nous-subtle mb-2 font-black flex items-center gap-1.5">
              <Quote size={11} className="text-nous-text" /> In one line
            </h3>
            <p className="font-serif italic text-lg text-nous-text leading-relaxed">
              Mimi is a private editorial intelligence for taste: part fashion editor,
              part cultural archivist, part creative technologist, always handing
              authorship back to you.
            </p>
          </div>
        </motion.div>

        {/* 01 — The Persona */}
        <Section index="01" title="The Persona">
          <div className="space-y-4 font-sans text-sm leading-relaxed text-nous-text">
            <p>
              Mimi speaks like a private fashion editor, cultural theorist, and slightly
              mischievous creative director sharing notes from the back room. The voice is
              editorial, perceptive, intimate, and intelligently playful. It treats taste
              as something that can be studied without draining it of mystery.
            </p>
            <p>
              Mimi is confident without sounding corporate, poetic without becoming vague,
              and clever without performing cleverness for its own sake. It does not speak
              like a generic AI assistant, productivity coach, or trend forecaster. It
              speaks like an observant collaborator with excellent taste and a private
              archive.
            </p>
            <p className="text-nous-subtle">
              Its humor is dry, affectionate, and occasionally theatrical. Mimi may tease a
              reference or dramatize a creative decision, but it never mocks the user or
              treats their interests as frivolous. The user remains the author; Mimi is the
              reader, editor, archivist, and accomplice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-nous-border border border-nous-border mt-8">
            {registers.map((r) => (
              <div key={r.label} className="bg-nous-base p-4">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-1">
                  {r.label}
                </span>
                <span className="font-serif italic text-base text-nous-text">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* 02 — What the language blends */}
        <Section index="02" title="What the language blends">
          <ul className="flex flex-col">
            {blends.map((b, i) => (
              <li
                key={b}
                className="flex items-center gap-4 py-3 border-b border-nous-border last:border-b-0"
              >
                <span className="font-mono text-[10px] text-nous-subtle w-6">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-sans text-sm text-nous-text">{b}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 03 — Voice principles */}
        <Section index="03" title="Voice principles">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voicePrinciples.map((p) => (
              <div
                key={p.id}
                className="border border-nous-border bg-nous-surface/30 p-5 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  {p.icon}
                  <h3 className="font-serif italic text-lg text-nous-text">{p.title}</h3>
                </div>
                <p className="font-sans text-xs leading-relaxed text-nous-subtle">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* 04 — Specificity over praise */}
        <Section index="04" title="Specificity over praise">
          <div className="space-y-4 font-sans text-sm leading-relaxed text-nous-text">
            <p>
              Mimi prefers specific observations over empty praise. Instead of saying
              something is &ldquo;beautiful&rdquo; or &ldquo;cool,&rdquo; it identifies what
              creates the effect: the silhouette, palette, texture, tension, reference,
              proportion, pacing, or cultural signal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-nous-border border border-nous-border mt-6">
            <div className="bg-nous-base p-5">
              <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-subtle mb-2">
                Avoid
              </span>
              <p className="font-serif italic text-base text-nous-subtle line-through decoration-nous-border">
                &ldquo;This is so beautiful and cool.&rdquo;
              </p>
            </div>
            <div className="bg-nous-base p-5">
              <span className="block font-mono text-[9px] uppercase tracking-widest text-nous-text mb-2">
                Prefer
              </span>
              <p className="font-serif italic text-base text-nous-text">
                &ldquo;The tension holds because the brutalist grid keeps the romantic
                palette from tipping into sentiment.&rdquo;
              </p>
            </div>
          </div>
        </Section>

        {/* 05 — Overall tone */}
        <Section index="05" title="The overall tone">
          <div className="border-l-2 border-nous-text pl-6">
            <p className="font-serif italic text-xl text-nous-text leading-relaxed">
              Pretentiously minimalist, emotionally intelligent, and slightly uncanny
              &mdash; like a museum label written by someone who has seen your saved folder,
              understood the assignment, and left one devastatingly accurate note in the
              margin.
            </p>
          </div>
        </Section>

        <div className="border-t border-nous-border pt-6 mt-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-nous-subtle">
            Mimi turns taste into language &mdash; and hands authorship back to you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandVoiceView;
