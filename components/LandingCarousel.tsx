"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselItem {
  id: string;
  imageUrl: string;
  altText: string;
  title: string | null;
  description: string | null;
}

interface LandingCarouselProps {
  items: CarouselItem[];
  children?: React.ReactNode;
}

export default function LandingCarousel({ items, children }: LandingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      className="w-full h-[calc(100vh-4rem)] relative group bg-neutral-950 overflow-hidden"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {/* Slides Container */}
      <div className="w-full h-full relative overflow-hidden">
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {/* Slide image with slow zoom animation */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.altText}
                className={`object-cover w-full h-full transition-transform duration-[8000ms] ease-out ${
                  isActive ? "scale-105" : "scale-100"
                }`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />

              {/* Overlay for text readability (clear, crisp, rich gradient) */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent z-10" />

              {/* Text content overlay */}
              <div className="absolute inset-x-0 bottom-44 sm:bottom-48 md:bottom-56 z-20 px-4 md:px-8 text-center flex flex-col items-center">
                <div className={`max-w-3xl space-y-3 transition-all duration-1000 transform ${isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                  {item.title && (
                    <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                      {item.title}
                    </h3>
                  )}
                  {item.description && (
                    <p className="text-sm sm:text-base md:text-lg text-neutral-200 max-w-2xl mx-auto font-semibold drop-shadow">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Children overlay for action buttons and trust badges */}
      {children && (
        <div className="absolute inset-x-0 bottom-12 z-20 pointer-events-none flex justify-center">
          <div className="w-full max-w-4xl px-4 pointer-events-auto">
            {children}
          </div>
        </div>
      )}

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/80 hover:bg-neutral-850 hover:text-blue-400 text-white p-3 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/80 hover:bg-neutral-850 hover:text-blue-400 text-white p-3 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl cursor-pointer"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                index === currentIndex
                  ? "bg-blue-500 w-6"
                  : "bg-neutral-600 hover:bg-neutral-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
