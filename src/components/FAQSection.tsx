import React, { useState } from 'react';
import { FAQS } from '../data/mockData';

export const FAQSection: React.FC = () => {
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesQuery =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <section className="py-24 bg-[#f6f3f2]" id="faq">
      <div className="max-w-[840px] mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-base max-w-md mx-auto">
            Everything you need to know about our private chauffeur, rates, and airport pick-ups.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="Search questions (e.g. ERP tolls, flight delays, child seat)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-13 pl-12 pr-4 bg-white border border-gray-300/80 rounded-2xl shadow-xs outline-none text-sm text-gray-800 focus:border-[#ae0011]"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: 'all', label: 'All FAQs' },
              { id: 'pricing', label: 'Pricing & Tolls' },
              { id: 'booking', label: 'Booking & Delay' },
              { id: 'airport', label: 'Airport Meet & Greet' },
              { id: 'vehicles', label: 'Vehicles & Child Seats' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#ae0011] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-4 text-left">
          {filteredFaqs.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-gray-500 font-medium">
              No matching questions found. Contact our 24/7 team on WhatsApp for instant assistance!
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border border-gray-200/80 rounded-2xl bg-white overflow-hidden shadow-xs hover:border-gray-300 transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full px-6 md:px-8 py-5 flex justify-between items-center text-left font-bold text-gray-900 text-base md:text-lg focus:outline-none cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span
                      className={`material-symbols-outlined transition-transform duration-300 text-gray-400 ${
                        isOpen ? 'rotate-180 text-[#ae0011]' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 md:px-8 pb-6 text-gray-600 text-sm md:text-base leading-relaxed border-t border-gray-100 pt-3 animate-fadeIn">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
