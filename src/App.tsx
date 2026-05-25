/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Portfolio from "./components/Portfolio";
import Booking from "./components/Booking";
import Contact from "./components/Contact";
import Admin from "./components/Admin";
import { motion, useScroll, useSpring } from "motion/react";

function MainSite() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="relative">
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-brand-accent origin-left z-[60]"
        style={{ scaleX }}
      />
      
      <Navbar />
      
      <main>
        <Hero />
        
        <div id="services">
          <Services />
        </div>
        
        <div id="portfolio">
          <Portfolio />
        </div>
        
        <div id="booking">
          <Booking />
        </div>
      </main>

      <Contact />
      
      {/* Aesthetic floaters */}
      <div className="fixed top-1/2 right-10 -translate-y-1/2 z-40 hidden xl:flex flex-col space-y-10 items-center">
         <div className="w-[1px] h-20 bg-brand-ink/10" />
         <a href="https://instagram.com" target="_blank" className="text-brand-ink/40 hover:text-brand-accent transition-colors rotate-90 px-4 text-[10px] uppercase font-bold tracking-[0.2em] whitespace-nowrap">Instagram</a>
         <div className="w-[1px] h-20 bg-brand-ink/10" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

