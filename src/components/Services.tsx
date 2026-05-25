import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";

export default function Services() {
  const { t } = useLanguage();

  const services = [
    {
      category: t.services.essentials,
      items: [
        { name: t.services.henna, price: "160 000 sum", desc: t.services.hennaDesc },
        { name: t.services.maniNoCoat, price: "120 000 sum", desc: t.services.maniNoCoatDesc },
        { name: t.services.maniWithCoat, price: "200 000 sum", desc: t.services.maniWithCoatDesc },
        { name: t.services.extensions, price: t.services.extensionsPrice, desc: t.services.extensionsDesc },
        { name: t.services.correction, price: "250 000 sum", desc: t.services.correctionDesc },
        { name: t.services.veneer, price: "250 000 sum", desc: t.services.veneerDesc },
      ]
    },
    {
      category: t.services.art,
      items: [
        { name: t.services.removeOther, price: "30 000 sum", desc: t.services.removeOtherDesc },
        { name: t.services.removeOnly, price: "50 000 sum", desc: t.services.removeOnlyDesc },
        { name: t.services.repairOne, price: "20 000 sum", desc: t.services.repairOneDesc },
        { name: t.services.frenchRubOmbre, price: "30 000 sum", desc: t.services.frenchRubOmbreDesc },
        { name: t.services.designFrom, price: t.services.designFromPrice, desc: t.services.designFromDesc },
        { name: t.services.facialMassage, price: "100 000 sum", desc: t.services.facialMassageDesc },
      ]
    },
    {
      category: t.services.hennaArtCategory,
      items: [
        { name: t.services.hennaMini, price: "30 000–50 000 sum", desc: t.services.hennaMiniDesc },
        { name: t.services.hennaHand, price: "70 000–120 000 sum", desc: t.services.hennaHandDesc },
        { name: t.services.hennaTwoHands, price: "120 000–200 000 sum", desc: t.services.hennaTwoHandsDesc },
        { name: t.services.hennaForearm, price: "100 000–180 000 sum", desc: t.services.hennaForearmDesc },
        { name: t.services.hennaLargeArea, price: "150 000–350 000 sum", desc: t.services.hennaLargeAreaDesc },
        { name: t.services.hennaOrientalComplex, price: "250 000 sum dan", desc: t.services.hennaOrientalComplexDesc },
      ],
    }
  ];

  return (
    <section id="services" className="py-24 bg-white border-y border-brand-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20">
          <div className="max-w-xl">
             <h2 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-6">
               {t.services.title} <span className="serif italic font-bold">{t.services.titleItalic}</span>
             </h2>
             <p className="text-brand-muted text-sm font-normal">{t.services.description}</p>
          </div>
          <div className="mt-8 md:mt-0 flex items-center gap-4">
             <span className="w-2 h-2 rounded-full bg-green-400"></span>
             <p className="text-[10px] text-brand-muted uppercase tracking-[0.3em] font-bold">{t.services.bookingStatus}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-24 gap-y-12">
          {services.map((group, idx) => (
            <div key={idx} className="bg-brand-paper p-10 rounded-3xl border border-brand-border h-full flex flex-col">
              <h3 className="text-base uppercase tracking-[0.35em] font-black text-brand-ink mb-10 pb-4 border-b border-brand-border">
                {group.category}
              </h3>
              <div className="space-y-6 flex-grow">
                {group.items.map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex justify-between items-center group relative border-b border-brand-secondary pb-4"
                  >
                    <div className="flex flex-col">
                      <span className="text-base font-semibold tracking-tight text-brand-ink group-hover:text-brand-accent transition-colors">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-brand-muted mt-1 uppercase tracking-wider">
                        {item.desc.split(',')[0]}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-brand-ink/80">
                      {item.price}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
