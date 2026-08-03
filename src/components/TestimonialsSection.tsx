import React, { useState } from 'react';
import { REVIEWS } from '../data/mockData';
import { Review } from '../types';

export const TestimonialsSection: React.FC = () => {
  const [reviewsList, setReviewsList] = useState<Review[]>(REVIEWS);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);

  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRole, setNewReviewRole] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName || !newReviewComment) return;

    const item: Review = {
      id: `rev-${Date.now()}`,
      name: newReviewName,
      role: newReviewRole || 'Valued Traveler',
      location: newReviewLocation || 'Singapore',
      comment: newReviewComment,
      rating: newReviewRating,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    };

    setReviewsList([item, ...reviewsList]);
    setShowAddReviewModal(false);
    setNewReviewName('');
    setNewReviewRole('');
    setNewReviewLocation('');
    setNewReviewComment('');
  };

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="grid lg:grid-cols-3 gap-12 lg:gap-16 items-center">
          {/* Left summary column */}
          <div className="text-left">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-6">
              What Our VIP Clients Say
            </h2>

            <p className="text-gray-600 text-base mb-8 leading-relaxed">
              Trusted by thousands of travelers for business and leisure trips across Singapore and Malaysia.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {REVIEWS.map((rev, idx) => (
                  <img
                    key={idx}
                    src={rev.avatar}
                    alt={rev.name}
                    className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm"
                  />
                ))}
              </div>

              <div>
                <div className="font-extrabold text-base text-gray-900">4.9 / 5 Rating</div>
                <div className="flex text-[#795900] text-sm mt-0.5">
                  {'★'.repeat(5)}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowAddReviewModal(true)}
                className="px-5 py-2.5 rounded-full border border-gray-300 hover:border-[#ae0011] text-[#ae0011] font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">rate_review</span>
                <span>Share Your Experience</span>
              </button>
            </div>
          </div>

          {/* Right reviews scroll / cards */}
          <div className="lg:col-span-2">
            <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x pb-4">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="min-w-[280px] sm:min-w-[360px] snap-center p-8 bg-[#F8F9FB] rounded-[2.5rem] border border-gray-200/50 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="text-[#ae0011] mb-4">
                      <span className="material-symbols-outlined text-[42px]">
                        format_quote
                      </span>
                    </div>

                    <div className="flex text-amber-500 text-sm mb-3">
                      {'★'.repeat(rev.rating)}
                    </div>

                    <p className="text-base italic text-gray-800 mb-6 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200/60">
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="w-10 h-10 rounded-full object-cover shadow-xs"
                    />
                    <div>
                      <div className="font-bold text-sm text-gray-900">{rev.name}</div>
                      <div className="text-xs text-gray-500 font-medium">
                        {rev.role} • {rev.location}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Review Modal */}
      {showAddReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-left relative">
            <button
              onClick={() => setShowAddReviewModal(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-black"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-gray-900 mb-2">
              Share Your VIP Feedback
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              How was your private transfer or tour experience with STB Singapore?
            </p>

            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={newReviewName}
                  onChange={(e) => setNewReviewName(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Traveler Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Business / Family"
                    value={newReviewRole}
                    onChange={(e) => setNewReviewRole(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. USA / Japan"
                    value={newReviewLocation}
                    onChange={(e) => setNewReviewLocation(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rating</label>
                <div className="flex gap-2 text-2xl text-amber-500 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewReviewRating(star)}
                      className="focus:outline-none"
                    >
                      {star <= newReviewRating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Review Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe your driver, vehicle cleanliness, punctuality..."
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#ae0011] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#d71920] shadow-md transition-all cursor-pointer"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
