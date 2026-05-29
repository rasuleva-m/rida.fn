import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "../LanguageContext";

const API_BASE = (import.meta.env.VITE_BOOKING_API_URL as string | undefined)?.replace(
  /\/$/,
  ""
) ?? "";

type SlotState = "idle" | "loading" | "ready" | "unavailable" | "error";

export default function Booking() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const serviceOptions = [
    { id: "henna", label: t.services.henna },
    { id: "hennaMini", label: t.services.hennaMini },
    { id: "hennaHand", label: t.services.hennaHand },
    { id: "hennaTwoHands", label: t.services.hennaTwoHands },
    { id: "hennaForearm", label: t.services.hennaForearm },
    { id: "hennaLargeArea", label: t.services.hennaLargeArea },
    { id: "hennaOrientalComplex", label: t.services.hennaOrientalComplex },
    { id: "maniNoCoat", label: t.services.maniNoCoat },
    { id: "maniWithCoat", label: t.services.maniWithCoat },
    { id: "extensions", label: t.services.extensions },
    { id: "correction", label: t.services.correction },
    { id: "veneer", label: t.services.veneer },
    { id: "removeOther", label: t.services.removeOther },
    { id: "removeOnly", label: t.services.removeOnly },
    { id: "repairOne", label: t.services.repairOne },
    { id: "frenchRubOmbre", label: t.services.frenchRubOmbre },
    { id: "designFrom", label: t.services.designFrom },
    { id: "facialMassage", label: t.services.facialMassage },
  ];
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    service: "maniNoCoat",
    date: "",
    time: "",
  });

  const [apiError, setApiError] = useState<string | null>(null);
  const [freeSlots, setFreeSlots] = useState<string[]>([]);
  const [slotState, setSlotState] = useState<SlotState>("idle");

  const selectedServiceLabel =
    serviceOptions.find((s) => s.id === formData.service)?.label ?? formData.service;

  const bookingUrl = API_BASE ? `${API_BASE}/api/booking` : "/api/booking";

  useEffect(() => {
    if (!formData.date) {
      setFreeSlots([]);
      setSlotState("idle");
      setFormData((prev) => ({ ...prev, time: "" }));
      return;
    }

    let cancelled = false;
    const loadSlots = async () => {
      setSlotState("loading");
      setFormData((prev) => ({ ...prev, time: "" }));
      try {
        const slotsUrl = API_BASE
          ? `${API_BASE}/api/available/${formData.date}`
          : `/api/available/${formData.date}`;
        const res = await fetch(slotsUrl);
        if (!res.ok) throw new Error("slots");
        const data = (await res.json()) as { freeSlots?: string[] };
        if (cancelled) return;
        const slots = data.freeSlots ?? [];
        setFreeSlots(slots);
        setSlotState(slots.length > 0 ? "ready" : "unavailable");
      } catch {
        if (cancelled) return;
        setFreeSlots([]);
        setSlotState("error");
      }
    };

    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!formData.name || !formData.phone || !formData.date || !formData.time) {
      setStatus("error");
      setApiError(t.booking.error);
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(bookingUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          service: selectedServiceLabel,
          date: formData.date,
          time: formData.time,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        freeSlots?: string[];
      };

      if (res.status === 409) {
        setStatus("error");
        setApiError(data.message ?? t.booking.slotTaken);
        if (data.freeSlots) {
          setFreeSlots(data.freeSlots);
          setSlotState(data.freeSlots.length > 0 ? "ready" : "unavailable");
        }
        return;
      }

      if (!res.ok || !data.success) {
        setStatus("error");
        setApiError(data.message ?? t.booking.error);
        return;
      }

      setStatus("success");
      setTimeout(() => {
        setStatus("idle");
        setFormData({ name: "", phone: "", service: "maniNoCoat", date: "", time: "" });
        setFreeSlots([]);
        setSlotState("idle");
      }, 4000);
    } catch {
      setStatus("error");
      setApiError(t.booking.networkError);
    }
  };

  const slotHint =
    slotState === "idle"
      ? t.booking.selectDateForSlots
      : slotState === "loading"
        ? t.booking.loadingSlots
        : slotState === "error" || slotState === "unavailable"
          ? t.booking.noSlots
          : null;

  return (
    <section id="booking" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-4xl md:text-5xl font-light uppercase tracking-tighter mb-8 tracking-widest leading-tight">
              {t.booking.title} <br />
              <span className="serif italic">{t.booking.titleItalic}</span>
            </h2>
            <p className="text-brand-muted mb-12 font-normal text-sm leading-relaxed max-w-sm">
              {t.booking.description}
            </p>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-full border border-brand-border flex items-center justify-center text-brand-accent">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-[11px] uppercase tracking-widest font-bold text-brand-muted italic">
                  {t.booking.benefit1}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-full border border-brand-border flex items-center justify-center text-brand-accent">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-[11px] uppercase tracking-widest font-bold text-brand-muted italic">
                  {t.booking.benefit2}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="p-10 rounded-3xl border border-brand-border bg-brand-paper shadow-sm relative"
          >
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-xl font-serif italic mb-2 tracking-tight">
                    {t.booking.successTitle}
                  </h3>
                  <p className="text-xs text-brand-muted uppercase tracking-widest mb-8">
                    {t.booking.successDesc}
                  </p>

                  <a
                    href="https://t.me/RidaNailBot"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-bold text-brand-ink hover:text-brand-accent transition-colors border border-brand-border px-6 py-3 rounded-full"
                  >
                    <span>{t.booking.directTelegram}</span>
                  </a>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-muted ml-1">
                        {t.booking.labelName}
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Alex Smith"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white border border-brand-border rounded-xl py-3.5 px-4 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-[13px] font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-muted ml-1">
                        {t.booking.labelPhone}
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="+998 97 402 23 05"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-white border border-brand-border rounded-xl py-3.5 px-4 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-[13px] font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-muted ml-1">
                      {t.booking.labelService}
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      className="w-full bg-white border border-brand-border rounded-xl py-3.5 px-4 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-[13px] font-medium appearance-none"
                    >
                      {serviceOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-muted ml-1">
                        {t.booking.labelDate}
                      </label>
                      <input
                        required
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-white border border-brand-border rounded-xl py-3.5 px-4 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-[13px] font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-muted ml-1">
                        {t.booking.labelTime}
                      </label>
                      {slotState === "ready" && freeSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {freeSlots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setFormData({ ...formData, time: slot })}
                              className={`py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                                formData.time === slot
                                  ? "bg-brand-ink text-white border-brand-ink"
                                  : "bg-white border-brand-border text-brand-ink hover:border-brand-accent"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <input
                          required
                          type="time"
                          step={3600}
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full bg-white border border-brand-border rounded-xl py-3.5 px-4 focus:ring-1 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all text-[13px] font-medium"
                        />
                      )}
                      {slotHint && (
                        <p className="text-[9px] text-brand-muted ml-1 leading-relaxed">
                          {slotHint}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={status === "loading"}
                    className="w-full bg-brand-ink text-white py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-brand-ink/80 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {status === "loading" ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      t.booking.cta
                    )}
                  </button>

                  <div className="flex items-center space-x-4 pt-4 opacity-60">
                    <div className="flex-grow h-[1px] bg-brand-border" />
                    <span className="text-[9px] uppercase tracking-widest font-bold">OR</span>
                    <div className="flex-grow h-[1px] bg-brand-border" />
                  </div>

                  <a
                    href="https://t.me/RidaNailBot"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full border border-brand-border py-4 rounded-full text-[11px] uppercase tracking-[0.3em] font-bold text-brand-ink hover:bg-brand-secondary transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span className="text-brand-accent">●</span>
                    <span>{t.booking.directTelegram}</span>
                  </a>

                  {status === "error" && (
                    <p className="text-red-500 text-[10px] uppercase text-center mt-2">
                      {apiError ?? t.booking.error}
                    </p>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
