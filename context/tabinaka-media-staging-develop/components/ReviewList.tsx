import React from "react";
import ReviewCard, { ReviewCardProps } from "./ReviewCard";

// ダミーデータ
const sampleReviews: ReviewCardProps[] = [
  {
    overall: 4.5,
    review:
      "Best sushi class in Shibuya. The chef was kind and the workflow was smooth. I learned a lot and it fit perfectly in our afternoon gap time. The ingredients were fresh and the atmosphere was welcoming. Highly recommend for anyone wanting to learn authentic Japanese sushi making!",
    categories: {
      satisfaction: 5,
      host: 5,
      cost: 4,
    },
    reviewer: {
      nationality: "🇺🇸",
      travelStyle: "Couple",
      ageGroup: "20s",
    },
  },
  {
    overall: 4.8,
    review:
      "Amazing kimono dressing experience! The staff was incredibly patient and helpful. They explained every step clearly and made sure we looked perfect. The kimono selection was beautiful and the photo session was a nice touch. Perfect for couples looking for a unique cultural experience.",
    categories: {
      satisfaction: 5,
      host: 5,
      cost: 4.5,
    },
    reviewer: {
      nationality: "🇫🇷",
      travelStyle: "Couple",
      ageGroup: "30s",
    },
  },
  {
    overall: 4.2,
    review:
      "Great sake tasting experience. Learned a lot about different types of sake and the history behind them. The venue had a nice view of Shibuya. Only downside was that it was a bit crowded, but the host managed it well. Good value for the price.",
    categories: {
      satisfaction: 4,
      host: 4.5,
      cost: 4,
    },
    reviewer: {
      nationality: "🇦🇺",
      travelStyle: "Solo",
      ageGroup: "40s",
    },
  },
  {
    overall: 3.7,
    review:
      "The fountain pen workshop was interesting but felt a bit rushed. The instructor was knowledgeable but we didn't have enough time to fully explore the techniques. The location was convenient though, right in the heart of Shibuya. Would recommend if you have extra time in your schedule.",
    categories: {
      satisfaction: 3.5,
      host: 4,
      cost: 3.5,
    },
    reviewer: {
      nationality: "🇨🇦",
      travelStyle: "Friends",
      ageGroup: "20s",
    },
  },
];

interface ReviewListProps {
  reviews?: ReviewCardProps[];
  title?: string;
  showTitle?: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({
  reviews = sampleReviews,
  title = "Customer Reviews",
  showTitle = true,
}) => {
  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">
            実際に体験されたお客様のレビューをご覧ください
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {reviews.map((review, index) => (
          <ReviewCard
            key={index}
            overall={review.overall}
            review={review.review}
            categories={review.categories}
            reviewer={review.reviewer}
          />
        ))}
      </div>

      {reviews.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">まだレビューがありません。</p>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
