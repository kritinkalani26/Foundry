"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface RatingWidgetProps {
  orderId: string;
  printerOwnerId: string;
  printerName: string;
}

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div>
      <Label className="text-sm text-gray-700">{label}</Label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
            aria-label={`${star} star`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hover || value)
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-500 self-center">{value}/5</span>
        )}
      </div>
    </div>
  );
}

export default function RatingWidget({ orderId, printerOwnerId, printerName }: RatingWidgetProps) {
  const [ratings, setRatings] = useState({ printQuality: 0, accuracy: 0, packaging: 0 });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allRated = ratings.printQuality > 0 && ratings.accuracy > 0 && ratings.packaging > 0;

  // Weighted composite: quality 50%, accuracy 35%, packaging 15%
  const composite =
    ratings.printQuality * 0.5 + ratings.accuracy * 0.35 + ratings.packaging * 0.15;

  async function handleSubmit() {
    if (!allRated) return;
    setSubmitting(true);
    try {
      await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          printerOwnerId,
          printQuality: ratings.printQuality,
          accuracy: ratings.accuracy,
          packaging: ratings.packaging,
          comment: comment.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-green-800">Thank you for your review!</h3>
          <p className="text-sm text-green-600 mt-1">
            Composite score: {composite.toFixed(1)}/5 · Helps future customers choose wisely.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rate Your Experience</CardTitle>
        <p className="text-sm text-gray-500">
          How was your print from <strong>{printerName}</strong>?
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <StarRating
          label="Print Quality (50% weight)"
          value={ratings.printQuality}
          onChange={(v) => setRatings((r) => ({ ...r, printQuality: v }))}
        />
        <StarRating
          label="Accuracy to Model (35% weight)"
          value={ratings.accuracy}
          onChange={(v) => setRatings((r) => ({ ...r, accuracy: v }))}
        />
        <StarRating
          label="Packaging (15% weight)"
          value={ratings.packaging}
          onChange={(v) => setRatings((r) => ({ ...r, packaging: v }))}
        />

        {allRated && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            Composite score: <strong>{composite.toFixed(2)}/5</strong>
            <span className="text-gray-400">(quality×0.50 + accuracy×0.35 + packaging×0.15)</span>
          </div>
        )}

        <div>
          <Label className="text-sm text-gray-700">Comment (optional)</Label>
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
            placeholder="Share your experience to help other customers..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <Button
          variant="brand"
          className="w-full"
          onClick={handleSubmit}
          disabled={!allRated || submitting}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
          ) : (
            "Submit Rating"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
