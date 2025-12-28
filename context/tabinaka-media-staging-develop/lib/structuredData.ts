import type { StructuredDataObject } from "@/components/SeoStructuredData";

const DEFAULT_URL = "https://gappytravel.com";
const DEFAULT_NAME = "Gappy";
const DEFAULT_DESCRIPTION =
  "Transform your free time in Shibuya into unforgettable Japanese experiences. Book authentic tours, food experiences, and cultural activities with exclusive coupons.";
const DEFAULT_LOGO = `${DEFAULT_URL}/gappy_icon.png`;
const DEFAULT_SAME_AS = [
  "https://twitter.com/DjMittzu",
  "https://www.instagram.com/shibuya_gap_travel/",
  "https://www.facebook.com/share/1AUPxgd7oz/",
  "https://www.tiktok.com/@kankankan0",
];

export interface StructuredDataBaseOptions {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

const withDefaults = (options: StructuredDataBaseOptions = {}) => ({
  name: options.name ?? DEFAULT_NAME,
  description: options.description ?? DEFAULT_DESCRIPTION,
  url: options.url ?? DEFAULT_URL,
  logo: options.logo ?? DEFAULT_LOGO,
  sameAs: options.sameAs ?? DEFAULT_SAME_AS,
});

export function buildWebsiteStructuredData(
  options: StructuredDataBaseOptions & { searchUrlTemplate?: string } = {},
): StructuredDataObject {
  const base = withDefaults(options);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: base.name,
    description: base.description,
    url: base.url,
    logo: base.logo,
    sameAs: base.sameAs,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          options.searchUrlTemplate ??
          `${base.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildOrganizationStructuredData(
  options: StructuredDataBaseOptions & {
    address?: {
      locality?: string;
      region?: string;
      country?: string;
    };
    contactEmail?: string;
  } = {},
): StructuredDataObject {
  const base = withDefaults(options);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: base.name,
    description: base.description,
    url: base.url,
    logo: base.logo,
    sameAs: base.sameAs,
    address: {
      "@type": "PostalAddress",
      addressLocality: options.address?.locality ?? "Shibuya",
      addressRegion: options.address?.region ?? "Tokyo",
      addressCountry: options.address?.country ?? "JP",
    },
    contactPoint: options.contactEmail
      ? {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: options.contactEmail,
        }
      : undefined,
  };
}

export function buildLocalBusinessStructuredData(
  options: StructuredDataBaseOptions & {
    address?: {
      locality?: string;
      region?: string;
      country?: string;
    };
    geo?: {
      latitude: number;
      longitude: number;
    };
  } = {},
): StructuredDataObject {
  const base = withDefaults(options);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: base.name,
    description: base.description,
    url: base.url,
    logo: base.logo,
    address: {
      "@type": "PostalAddress",
      addressLocality: options.address?.locality ?? "Shibuya",
      addressRegion: options.address?.region ?? "Tokyo",
      addressCountry: options.address?.country ?? "JP",
    },
    geo: options.geo
      ? {
          "@type": "GeoCoordinates",
          latitude: options.geo.latitude,
          longitude: options.geo.longitude,
        }
      : undefined,
  };
}

export function buildHomeStructuredData(): StructuredDataObject[] {
  return [
    buildWebsiteStructuredData(),
    buildOrganizationStructuredData({ contactEmail: "support@gappy.jp" }),
    buildLocalBusinessStructuredData({
      geo: { latitude: 35.658034, longitude: 139.701636 },
    }),
  ];
}

export interface ExperienceStructuredDataOptions
  extends StructuredDataBaseOptions {
  image?: string;
  price?: number;
  priceCurrency?: string;
  availability?: string;
  url: string;
  brandName?: string;
}

export function buildExperienceStructuredData(
  options: ExperienceStructuredDataOptions,
): StructuredDataObject {
  const base = withDefaults(options);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: options.name ?? base.name,
    description: options.description ?? base.description,
    image: options.image,
    url: options.url,
    brand: {
      "@type": "Brand",
      name: options.brandName ?? base.name,
      logo: base.logo,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: options.priceCurrency ?? "JPY",
      price: typeof options.price === "number" ? options.price : undefined,
      availability: options.availability ?? "https://schema.org/InStock",
      url: options.url,
    },
  };
}

export interface ArticleStructuredDataOptions
  extends StructuredDataBaseOptions {
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
  authorType?: "Organization" | "Person";
  publisherName?: string;
  publisherLogo?: string;
  url: string;
  inLanguage?: string;
  articleSection?: string;
  aboutPlace?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export function buildArticleStructuredData(
  options: ArticleStructuredDataOptions,
): StructuredDataObject {
  const base = withDefaults(options);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.name ?? base.name,
    description: options.description ?? base.description,
    image: options.image,
    datePublished: options.datePublished,
    dateModified: options.dateModified ?? options.datePublished,
    author: {
      "@type": options.authorType ?? "Organization",
      name: options.authorName ?? base.name,
    },
    publisher: {
      "@type": "Organization",
      name: options.publisherName ?? base.name,
      logo: {
        "@type": "ImageObject",
        url: options.publisherLogo ?? base.logo,
      },
    },
    mainEntityOfPage: options.url,
    url: options.url,
    inLanguage: options.inLanguage ?? "en",
    articleSection: options.articleSection,
    about: options.aboutPlace
      ? {
          "@type": "Place",
          name: options.aboutPlace.name,
          geo: {
            "@type": "GeoCoordinates",
            latitude: options.aboutPlace.latitude,
            longitude: options.aboutPlace.longitude,
          },
        }
      : undefined,
  };
}

export function buildBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
): StructuredDataObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
