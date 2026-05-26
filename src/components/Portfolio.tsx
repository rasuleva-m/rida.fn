import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";

export default function Portfolio() {
  const { t } = useLanguage();

  const media = import.meta.glob("../PortfolioPic/**/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,mov,MOV,mp4,MP4}", {
    eager: true,
    import: "default",
  }) as Record<string, string>;

  const portfolio = Object.entries(media)
    .map(([filePath, url]) => {
      const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
      const fileNameLower = fileName.toLowerCase();
      const orderMatch = fileNameLower.match(/^image_(\d{2})\.jpg$/);
      const orderGroup = orderMatch ? 0 : 1;
      const order = orderMatch ? Number(orderMatch[1]) : Number.POSITIVE_INFINITY;
      return {
        filePath,
        fileName,
        fileNameLower,
        url,
        orderGroup,
        order,
        isVideo: /\.(mov|mp4)$/i.test(fileNameLower),
      };
    })
    .sort((a, b) => {
      if (a.orderGroup !== b.orderGroup) return a.orderGroup - b.orderGroup;
      if (a.order !== b.order) return a.order - b.order;
      return a.fileNameLower.localeCompare(b.fileNameLower);
    });

  return (
    <section id="portfolio" className="py-24 bg-brand-paper">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 space-y-6 md:space-y-0">
          <div>
            <h2 className="text-4xl md:text-6xl font-light mb-4 uppercase tracking-tighter">{t.portfolio.title}<span className="serif italic">{t.portfolio.titleItalic}</span></h2>
            <p className="text-brand-muted uppercase tracking-[0.2em] text-[10px] font-bold">{t.portfolio.subtitle}</p>
          </div>
          <div className="flex space-x-12">
            <div className="text-center">
              <span className="block text-3xl font-serif italic">500+</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">{t.portfolio.happyClients}</span>
            </div>
            <div className="text-center border-l border-brand-border pl-12">
              <span className="block text-3xl font-serif italic">50+</span>
              <span className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">{t.portfolio.customDesigns}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-2 md:px-4 snap-x snap-mandatory">
            {portfolio.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-default w-[11rem] md:w-[13rem] flex-shrink-0 snap-start"
              >
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-brand-secondary border border-brand-border shadow-sm">
                  {item.isVideo ? (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      muted
                      loop
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt="Portfolio"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
