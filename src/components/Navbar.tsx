import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";
import { Language } from "../translations";

export default function Navbar() {
  const { language, setLanguage, t } = useLanguage();
  
  const navItems = [
    { label: t.nav.services, id: "services" },
    { label: t.nav.portfolio, id: "portfolio" },
    { label: t.nav.booking, id: "booking" },
    { label: t.nav.contact, id: "contact" },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
    { code: 'uz', label: 'UZ' },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-brand-paper/80 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="text-3xl font-serif italic font-bold tracking-tighter text-brand-ink leading-none">RIDA.FN</span>
          <span className="text-[10px] uppercase tracking-widest text-brand-muted mt-1 font-medium">Manikyur Beauty Studio</span>
        </motion.div>

        <div className="hidden lg:flex items-center space-x-10">
          <div className="flex space-x-8 mr-8 border-r border-brand-border pr-8">
            {navItems.map((item, i) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-ink hover:text-brand-accent transition-colors"
              >
                {item.label}
              </motion.a>
            ))}
          </div>

          <div className="flex space-x-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`text-[10px] font-bold tracking-widest transition-colors ${
                  language === lang.code ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-ink'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-brand-ink text-white px-8 py-2.5 rounded-full text-[11px] uppercase tracking-widest font-semibold hover:bg-brand-ink/80 transition-colors duration-300"
        >
          {t.nav.bookNow}
        </motion.button>
      </div>
    </nav>
  );
}
