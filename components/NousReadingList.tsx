import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Sparkles, Eye, Brain, RefreshCw } from 'lucide-react';

interface BookItem {
  title: string;
  author: string;
  lens: string;
  lensTag: string;
  justification: string;
}

const MASTER_READING_LIST: BookItem[] = [
  {
    title: "THE SOCIETY OF THE SPECTACLE",
    author: "Guy Debord",
    lens: "Aesthetic Savant",
    lensTag: "[ appreciatively ]",
    justification: "To understand the hyper-reality of the feed, one must first recognize the spectacle. We read Debord not to become ascetics, but to gain immunity. Once you see the matrix of influence, you curate for your own pleasure, not for the algorithm."
  },
  {
    title: "ON PHOTOGRAPHY",
    author: "Susan Sontag",
    lens: "Pretentiously Minimalist",
    lensTag: "[ paradoxically ]",
    justification: "Sontag dissects our compulsion to capture everything. We take her warning to heart: we stop obsessively documenting our lives for public consumption, and instead cultivate a private, internal archive. The real aesthetic experience is intimate."
  },
  {
    title: "LEGALLY BLONDE (SCRIPT)",
    author: "K. McCullah Lutz & K. Smith",
    lens: "Aesthetic Savant",
    lensTag: "[ appreciatively ]",
    justification: "The foundational text. A masterclass in weaponizing underestimated aesthetics. It proves that holding a rigorous intellectual interior doesn't require forfeiting your love of pink. Intelligence is an accessory you wear subtly."
  },
  {
    title: "SIMULACRA AND SIMULATION",
    author: "Jean Baudrillard",
    lens: "Pretentiously Minimalist",
    lensTag: "[ paradoxically ]",
    justification: "Baudrillard posits that the reality we obsess over is merely a copy. Knowing this frees us from the anxious pursuit of 'authenticity.' If everything is a construct, you have absolute permission to build a beautiful sandbox purely for your own enjoyment."
  },
  {
    title: "THE SECRET HISTORY",
    author: "Donna Tartt",
    lens: "Aesthetic Savant",
    lensTag: "[ appreciatively ]",
    justification: "Dark academia but make it dangerously chic. It teaches us that beauty is rarely innocent, and that romanticizing existence has high stakes. A must-read for the morally ambiguous intellectual with a taste for bespoke tailoring."
  },
  {
    title: "EROS THE BITTERSWEET",
    author: "Anne Carson",
    lens: "Pretentiously Minimalist",
    lensTag: "[ paradoxically ]",
    justification: "Greek antiquity meets visceral emotional geometry. For when you want to languish beautifully in the private tragedy of desire, observing your own feelings with clinical, detached erudition."
  },
  {
    title: "VALLEY OF THE DOLLS",
    author: "Jacqueline Susann",
    lens: "Aesthetic Savant",
    lensTag: "[ appreciatively ]",
    justification: "A terrifyingly accurate sociology of ambition and superficiality masked as a trashy beach read. We read it as a cautionary syllabus: this is what happens when aesthetics become entirely tied to external validation instead of internal anchoring."
  },
  {
    title: "WAYS OF SEEING",
    author: "John Berger",
    lens: "Pretentiously Minimalist",
    lensTag: "[ paradoxically ]",
    justification: "Berger brutally tears down the commodification of visual art. By internalizing this critique, we strip away the need to 'perform' our taste. We reclaim visual culture not as a currency for attention, but as a private sanctuary of self-discovery."
  },
  {
    title: "NOTES ON 'CAMP'",
    author: "Susan Sontag",
    lens: "Aesthetic Savant",
    lensTag: "[ appreciatively ]",
    justification: "The quintessential thesis on the love of the unnatural, of artifice and exaggeration. It gives us the vocabulary to defend our most extravagant tastes—not as guilty pleasures, but as a sophisticated lens through which to view the world."
  },
  {
    title: "THE MEDIUM IS THE MASSAGE",
    author: "Marshall McLuhan",
    lens: "Pretentiously Minimalist",
    lensTag: "[ paradoxically ]",
    justification: "A visual and textual assault that predicts the psychic displacement caused by electronic media. It teaches us that the interfaces we use shape our thoughts; thus, we must rigidly control our digital habitats."
  }
];

// Helper to get random items
const getRandomItems = (arr: BookItem[], n: number) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

export const NousReadingList: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [currentList, setCurrentList] = useState<BookItem[]>([]);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    // Initial rotation
    setCurrentList(getRandomItems(MASTER_READING_LIST, 4));
  }, []);

  const handleRotate = () => {
    setIsRotating(true);
    setTimeout(() => {
      setCurrentList(getRandomItems(MASTER_READING_LIST, 4));
      setIsRotating(false);
    }, 400); // match animation duration
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center bg-nous-base p-4 sm:p-8"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
        className="w-full h-full max-w-4xl bg-nous-base border border-nous-border shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-nous-border">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-nous-text opacity-50" />
            <h2 className="font-sans text-xs uppercase tracking-[0.25em] text-nous-text font-black">
              Curation: The Bimbo Intellectual
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-nous-text hover:text-nous-base transition-colors border border-transparent rounded-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 hide-scrollbar space-y-12">
            
          <div className="max-w-2xl mx-auto text-center space-y-8 mb-12">
            <div className="space-y-4">
                <h1 className="font-serif italic text-4xl text-nous-text">A Syllabus for the Hyperreal</h1>
                <p className="font-sans text-xs uppercase tracking-widest text-nous-subtle">Curated by Nous</p>
            </div>

            <div className="text-left bg-white/5 border border-white/10 p-6 space-y-4 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-nous-text/20" />
                <p className="font-sans text-[10px] uppercase tracking-widest text-white font-black">Curatorial Statement</p>
                <div className="space-y-4 font-serif text-sm text-nous-subtle leading-relaxed">
                    <p>
                        To be viciously self-aware is to understand the critique of visual culture without letting it destroy the pleasure of the visual. Yes, the spectacle is everywhere. Yes, aesthetics can be weaponized for attention. But Nous operates on a different frequency: <strong>the reclamation of beauty for its own sake.</strong>
                    </p>
                    <p>
                        We gain immunity to the hyperreal not by rejecting it, but by structurally decoding it. When you understand the architecture of influence—the algorithm, the simulation, the gaze—you are no longer subjected to it. You become the architect of your own perception. One can enjoy their own superficial pleasures secretly or securely, shielded by an intellectual fortress. Everyone deserves that untethered enjoyment.
                    </p>
                    <p>
                        This syllabus rotates through critical texts that play with the tension between the critique of the image and the love of it. We study the anti-culture not to reject aesthetics, but to liberate our personal taste from the economy of attention. Here, curation is not a performance for the feed; it is an intimate, intellectual sanctuary. You are invited to deeply read the theory of simulation so that you may return to your gloss and tailoring with absolute, unassailable mastery.
                    </p>
                </div>
            </div>
            
            <div className="flex justify-center">
                <button 
                  onClick={handleRotate}
                  disabled={isRotating}
                  className="flex items-center gap-2 px-6 py-3 border border-nous-border text-nous-text font-sans text-[10px] uppercase tracking-widest hover:bg-nous-text hover:text-nous-base transition-colors"
                >
                  <RefreshCw size={12} className={isRotating ? "animate-spin" : ""} />
                  {isRotating ? "Consulting..." : "Rotate Sub-Syllabus"}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 relative min-h-[400px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentList.map(i => i.title).join(',')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 absolute inset-0 w-full top-0"
              >
                {currentList.map((book, idx) => (
                  <div 
                    key={idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="relative group flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start border-t border-nous-border/50 pt-3">
                        <span className="font-mono text-[10px] text-nous-subtle">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="flex items-center gap-1.5 opacity-60">
                            {book.lens === "Aesthetic Savant" ? <Eye size={12} /> : <Brain size={12} />}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-serif text-lg text-nous-text leading-tight group-hover:italic transition-all">
                          {book.title}
                        </h3>
                        <p className="font-sans text-[10px] uppercase tracking-widest text-nous-subtle">
                          by {book.author}
                        </p>
                    </div>

                    <div className="bg-nous-text/5 p-4 border-l border-nous-text/20 space-y-2 mt-4 relative overflow-hidden flex-grow">
                        <div className={`absolute top-0 left-0 w-full h-[1px] bg-nous-text transition-transform duration-500 origin-left ${hoveredIndex === idx ? 'scale-x-100' : 'scale-x-0'}`} />
                        <p className="font-sans text-[10px] uppercase tracking-widest text-nous-text font-black flex items-center gap-2">
                            {book.lens} <span className="font-mono font-normal opacity-50 lowercase">{book.lensTag}</span>
                        </p>
                        <p className="font-serif text-sm leading-relaxed text-nous-subtle">
                            {book.justification}
                        </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-nous-border bg-nous-base flex justify-between items-center text-nous-subtle font-mono text-[10px] uppercase tracking-widest">
            <span>Nous Knowledge Matrix</span>
            <span>Index: BIMBO_INT_ROTATION</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NousReadingList;
