import dynamic from "next/dynamic";

export const LazyMotivationCarousel = dynamic(
  () => import("./MotivationCarousel"),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
    ),
    ssr: false,
  },
);

export const LazyExperiencesCarousel = dynamic(
  () => import("./ExperiencesCarousel"),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
    ),
    ssr: false,
  },
);

export const LazyArticlesCarousel = dynamic(
  () => import("./ArticlesCarousel"),
  {
    loading: () => (
      <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />
    ),
    ssr: false,
  },
);
