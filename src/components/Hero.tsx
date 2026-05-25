import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";
import heroImage from "../AvatarPic/IMG_6011.PNG";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-brand-paper pt-20">
      <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10"
        >
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-muted mb-6 block">
            {t.hero.subtitle}
          </span>
          <h1 className="text-7xl md:text-9xl font-extralight leading-[0.9] mb-8 tracking-tighter text-brand-ink">
            {t.hero.title} <br />
            <span className="serif italic">{t.hero.titleItalic}</span>
          </h1>
          <p className="text-sm text-brand-muted max-w-sm mb-12 leading-relaxed font-normal">
            {t.hero.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
               onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
               className="bg-brand-ink text-white px-10 py-4 rounded-full text-[11px] uppercase tracking-widest font-bold hover:bg-brand-ink/80 transition-all duration-300 shadow-sm"
            >
              {t.hero.ctaBook}
            </button>
            <button 
               onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}
               className="border border-brand-border px-10 py-4 rounded-full text-[11px] uppercase tracking-widest font-bold hover:bg-brand-secondary transition-all duration-300"
            >
              {t.hero.ctaPortfolio}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="relative flex items-center justify-center px-4"
        >
          <div className="w-[520px] md:w-[600px] lg:w-[680px] aspect-[3/4] rounded-t-[999px] rounded-b-[64px] ring-1 ring-brand-accent/30 overflow-hidden shadow-2xl bg-brand-paper">
            <img 
              src={heroImage}
              alt="RIDA.FN"
              className="w-full h-full object-cover object-[50%_18%] transform hover:scale-105 transition-transform duration-1000"
            />
          </div>
          {/* Floating elements */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-32 h-32 bg-brand-accent/10 border border-brand-accent/20 rounded-full backdrop-blur-sm -z-10"
          />
          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-10 -left-10 w-48 h-48 bg-brand-ink/5 border border-brand-ink/10 rounded-full backdrop-blur-sm -z-10"
          />
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4">
        <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-ink/40">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-brand-ink/40 to-transparent" />
      </div>
    </section>
  );
}
