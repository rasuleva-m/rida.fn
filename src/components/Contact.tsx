import { Instagram, MapPin, Phone, Mail } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export default function Contact() {
  const { t } = useLanguage();

  return (
    <footer id="contact" className="bg-brand-ink text-brand-paper py-24 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="col-span-1 lg:col-span-1">
             <h3 className="text-3xl font-serif italic mb-6 tracking-tighter uppercase leading-none">RIDA.FN</h3>
             <p className="text-brand-paper/50 font-normal text-xs leading-relaxed mb-10 max-w-[200px]">
                {t.contact.description}
             </p>
             <div className="flex space-x-4">
                <a href="https://instagram.com" target="_blank" className="w-10 h-10 border border-brand-paper/20 rounded-full flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent hover:text-brand-ink transition-all">
                  <Instagram size={18} />
                </a>
             </div>
          </div>

          <div>
             <h4 className="text-[10px] uppercase tracking-[0.5em] font-bold text-brand-paper/30 mb-8">{t.contact.location}</h4>
             <div className="flex space-x-4 items-start">
               <MapPin size={18} className="mt-1 text-brand-accent" />
               <p className="text-sm font-light text-brand-paper/70">
                 123 Beauty Blvd, Suite 100<br/>
                 Los Angeles, CA 90210
               </p>
             </div>
          </div>

          <div>
             <h4 className="text-[10px] uppercase tracking-[0.5em] font-bold text-brand-paper/30 mb-8">{t.contact.contact}</h4>
             <div className="space-y-6">
                <div className="flex space-x-4 items-center">
                  <Phone size={18} className="text-brand-accent" />
                  <p className="text-sm font-light text-brand-paper/70">+998 97 402 23 05</p>
                </div>
                <div className="flex space-x-4 items-center">
                  <Mail size={18} className="text-brand-accent" />
                  <p className="text-sm font-light text-brand-paper/70">studio@rida.fn</p>
                </div>
             </div>
          </div>

          <div>
             <h4 className="text-[10px] uppercase tracking-[0.5em] font-bold text-brand-paper/30 mb-8">{t.contact.hours}</h4>
             <div className="space-y-4 text-sm font-light text-brand-paper/70">
                <div className="flex justify-between">
                   <span>{t.contact.tue}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
                <div className="flex justify-between">
                   <span>{t.contact.wed}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
                <div className="flex justify-between">
                   <span>{t.contact.thu}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
                <div className="flex justify-between">
                   <span>{t.contact.fri}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
                <div className="flex justify-between">
                   <span>{t.contact.sat}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
                <div className="flex justify-between">
                   <span>{t.contact.sun}</span>
                   <span className="text-brand-accent">10:00 AM - 05:00 PM</span>
                </div>
             </div>
          </div>
        </div>

        <div className="pt-12 border-t border-brand-paper/10 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
           <p className="text-[10px] uppercase tracking-widest text-brand-paper/40 italic">
             © 2026 RIDA.FN — {t.contact.rights}
           </p>
           <div className="flex space-x-8 text-[10px] uppercase tracking-widest font-bold text-brand-paper/60">
              <a href="#" className="hover:text-brand-accent transition-colors">Privacy</a>
              <a href="#" className="hover:text-brand-accent transition-colors">Terms</a>
           </div>
        </div>
      </div>

      {/* Decorative vertical lines */}
      <div className="absolute top-0 right-1/4 w-[1px] h-full bg-brand-paper/5" />
      <div className="absolute top-0 right-1/3 w-[1px] h-full bg-brand-paper/5" />
    </footer>
  );
}
