import React, { useState } from 'react';
import { Star, Send, X, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface OrderReviewModalProps {
  orderId: string;
  token: string;
  onClose: () => void;
  onSkip: () => void;
  onSuccess?: () => void;
}

export const OrderReviewModal: React.FC<OrderReviewModalProps> = ({
  orderId,
  token,
  onClose,
  onSkip,
  onSuccess
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please tap a star to give your rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitOrderReview(orderId, { rating, feedback });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingFeedback = (stars: number) => {
    switch (stars) {
      case 1: return '😞 Disappointed';
      case 2: return '😐 Could be better';
      case 3: return '🙂 Good';
      case 4: return '😊 Very good!';
      case 5: return '🤩 Outstanding!';
      default: return 'Tap to rate';
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-zinc-100">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 mb-1.5">Feedback Received!</h3>
          <p className="text-zinc-600 text-xs sm:text-sm mb-6 leading-relaxed">
            Thank you for rating Order #{token}. Your honest review helps our stalls serve you better every day!
          </p>
          <button
            onClick={onClose}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-2xl transition-colors text-sm shadow-md cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-zinc-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 leading-tight">Rate Your Order</h3>
              <p className="text-[11px] text-zinc-500">Token #{token} • Completed Order</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Star Rating Section */}
        <div className="text-center py-2">
          <p className="text-xs font-bold text-zinc-600 mb-3">
            How was your overall meal and dining experience?
          </p>

          <div className="flex justify-center items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(star => {
              const active = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 hover:scale-120 transition-transform cursor-pointer focus:outline-none"
                  aria-label={`${star} Stars`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                        : 'text-zinc-200 fill-zinc-100 hover:text-amber-200'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <p className="text-xs font-black text-brand-600 h-5 transition-all">
            {getRatingFeedback(hoverRating || rating)}
          </p>
        </div>

        {/* Feedback text area */}
        <div className="mt-3">
          <label className="block text-[11px] font-bold text-zinc-600 mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Tell us more (optional)</span>
          </label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell us about the taste, portion, speed, or staff service..."
            className="w-full text-xs p-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none transition-all placeholder:text-zinc-400"
          />
          <div className="flex justify-end text-[10px] text-zinc-400 mt-1">
            {feedback.length}/500
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200 mt-2 text-center font-semibold">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={onSkip}
            className="py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold text-xs transition-colors cursor-pointer sm:order-1 order-2 text-center"
          >
            Skip / Not Now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer sm:order-2 order-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
