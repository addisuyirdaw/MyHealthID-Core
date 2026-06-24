"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface CarouselItem {
  id: string;
  imageUrl: string;
  headingEn: string;
  headingAm: string;
  textEn: string;
  textAm: string;
  sortOrder: number;
}

interface LandingCarouselProps {
  items: CarouselItem[];
  children?: React.ReactNode;
}

export default function LandingCarousel({ items, children }: LandingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { language } = useLanguage();

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 6000); // Auto-play cycle of 6 seconds
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (items.length > 1) {
      startTimer();
    }
    return () => stopTimer();
  }, [items]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    startTimer();
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
    startTimer();
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    startTimer();
  };

  if (items.length === 0) return null;

  return (
    <div
      className="w-full relative group bg-neutral-950 overflow-hidden aspect-[3/4] sm:aspect-[16/9] sm:max-h-[90vh]"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {/* ── Background Slides ──────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          const heading = language === "AM" ? item.headingAm : item.headingEn;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {/* Slide image with slow Ken Burns zoom */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl || "/images/fallback-carousel.jpg"}
                alt={heading}
                className={`object-cover w-full h-full transition-transform duration-[8000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith("/images/fallback-carousel.jpg")) {
                    target.src = "/images/fallback-carousel.jpg";
                  }
                }}
              />
              {/* Dark canvas overlay — rich gradient for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/55 to-neutral-950/10" />
            </div>
          );
        })}
      </div>

      {/* ── Slide Text Titles — upper zone ────────────────────────────────── */}
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        const heading = language === "AM" ? item.headingAm : item.headingEn;
        const text = language === "AM" ? item.textAm : item.textEn;
        return (
          <div
            key={`text-${item.id}`}
            className={`absolute inset-x-0 z-20 flex flex-col items-center justify-center text-center px-6
              top-0 bottom-[47%] sm:bottom-[42%]
              pointer-events-none transition-all duration-1000 ${
                isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
          >
            <div className="max-w-3xl space-y-2 sm:space-y-3">
              {heading && (
                <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  {heading}
                </h2>
              )}
              {text && (
                <p className="text-xs sm:text-base md:text-lg text-neutral-200 max-w-2xl mx-auto font-semibold drop-shadow">
                  {text}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Material Card Overlay — bottom action zone ─────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-5 sm:px-6 sm:pb-7 flex justify-center">
        <div className="w-full max-w-3xl backdrop-blur-md bg-neutral-950/70 border border-neutral-800/60 rounded-2xl shadow-2xl overflow-hidden">
          {/* Action buttons / trust badges slot */}
          {children && (
            <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
              {children}
            </div>
          )}

          {/* Pagination dots — integrated inside the card footer */}
          {items.length > 1 && (
            <div className="flex justify-center gap-2 pb-3">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    index === currentIndex
                      ? "bg-blue-500 w-5"
                      : "bg-neutral-600 hover:bg-neutral-400 w-1.5"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation Arrows ─────────────────────────────────────────────── */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-[28%] sm:top-1/2 -translate-y-1/2 z-30 bg-neutral-900/80 hover:bg-neutral-800 hover:text-blue-400 text-white p-2.5 sm:p-3 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-[28%] sm:top-1/2 -translate-y-1/2 z-30 bg-neutral-900/80 hover:bg-neutral-800 hover:text-blue-400 text-white p-2.5 sm:p-3 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}
    </div>
  );
}

