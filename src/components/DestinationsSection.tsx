import React from 'react';
import { DESTINATIONS } from '../data/mockData';
import { Destination } from '../types';

interface DestinationsSectionProps {
  onSelectDestination: (dest: Destination) => void;
}

export const DestinationsSection: React.FC<DestinationsSectionProps> = ({
  onSelectDestination
}) => {
  return (
    <section className="py-24 bg-white" id="destinations">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="text-center mb-16">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-4">
            Explore Singapore
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-base leading-relaxed">
            Visit the most iconic landmarks with the comfort of a private chauffeur.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[550px]">
          {DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              onClick={() => onSelectDestination(dest)}
              className={`${dest.gridSpan} relative rounded-3xl overflow-hidden group cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 min-h-[260px] flex flex-col justify-end p-8`}
            >
              {/* Background image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${dest.image}')` }}
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity group-hover:opacity-90" />

              {/* Card content */}
              <div className="relative z-10 text-left text-white space-y-2">
                {dest.tag && (
                  <span className="bg-[#795900] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block mb-2 shadow-sm">
                    {dest.tag}
                  </span>
                )}

                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl md:text-3xl text-white">
                  {dest.name}
                </h3>

                <p className="text-white/80 text-sm max-w-md line-clamp-2 leading-relaxed">
                  {dest.description}
                </p>

                <div className="pt-2 flex items-center gap-1.5 text-amber-300 font-bold text-xs group-hover:translate-x-1.5 transition-transform">
                  <span>Book Transfer to {dest.name}</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
