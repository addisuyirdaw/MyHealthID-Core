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
}

export default function LandingCarousel({ items }: LandingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000); // Auto-play cycle of 5 seconds
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
      className="w-full max-w-6xl md:max-w-7xl mx-auto rounded-2xl shadow-2xl aspect-[16/8] md:aspect-[21/9] object-cover overflow-hidden border border-neutral-800 relative group bg-neutral-950"
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.altText}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // If image fails, show an icon / gradient fallback
                  (e.target as HTMLElement).style.display = "none";
                }}
              />

              {/* Gradient Overlay for Text */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />

              {/* Text content overlay */}
              <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 text-left z-20">
                {item.title && (
                  <h3 className="text-lg md:text-xl font-extrabold text-white mb-1.5 drop-shadow-md">
                    {item.title}
                  </h3>
                )}
                {item.description && (
                  <p className="text-xs md:text-sm text-neutral-300 font-medium max-w-xl drop-shadow">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows (shown on group-hover) */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/60 hover:bg-neutral-800 text-white p-2 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition duration-300"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-neutral-900/60 hover:bg-neutral-800 text-white p-2 rounded-full border border-neutral-800 opacity-0 group-hover:opacity-100 transition duration-300"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
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
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-blue-500 w-5"
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
