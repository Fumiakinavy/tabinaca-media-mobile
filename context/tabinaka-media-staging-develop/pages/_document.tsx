import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#22c55e" />
        <link rel="icon" href="/gappy_icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/gappy_icon.png" />
        <link rel="shortcut icon" href="/gappy_icon.png" />
        <meta
          name="description"
          content="Gappy - Discover authentic Japanese experiences in Shibuya. Book traditional activities like kimono wearing, goldfish scooping, sushi making, Shibuya sightseeing tours, and gourmet experiences with special coupons."
        />
        <meta
          name="keywords"
          content="Gappy, Shibuya, Japanese experience, kimono experience, goldfish scooping, sushi making, Shibuya sightseeing, Tokyo tour, Japanese culture experience, Shibuya gourmet, authentic Japanese experience, Shibuya sightseeing tour, Japan travel, Tokyo sightseeing, Shibuya experience, Japanese culture, Shibuya food tour, traditional Japanese experience, Shibuya tourist spots, Japanese experience booking"
        />
        <meta name="author" content="Gappy" />
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />

        <meta
          property="og:title"
          content="Gappy - Discover Authentic Japanese Experiences in Shibuya | Kimono, Goldfish Scooping, Sushi Making"
        />
        <meta
          property="og:description"
          content="Gappy - Discover authentic Japanese experiences in Shibuya. Book traditional activities like kimono wearing, goldfish scooping, sushi making, Shibuya sightseeing tours, and gourmet experiences with special coupons."
        />
        <meta property="og:image" content="https://gappytravel.com/images/hero.jpg" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gappytravel.com" />
        <meta property="og:site_name" content="Gappy" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@DjMittzu" />
        <meta name="twitter:creator" content="@DjMittzu" />
        <meta
          name="twitter:title"
          content="Gappy - Discover Authentic Japanese Experiences in Shibuya"
        />
        <meta
          name="twitter:description"
          content="Discover authentic Japanese experiences in Shibuya. Book traditional activities like kimono wearing, goldfish scooping, sushi making, Shibuya sightseeing tours, and gourmet experiences with special coupons."
        />
        <meta name="twitter:image" content="https://gappytravel.com/images/hero.jpg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
