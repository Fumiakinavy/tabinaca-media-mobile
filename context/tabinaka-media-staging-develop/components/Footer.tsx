import Link from "next/link";
import Image from "next/image";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Services",
      links: [
        { name: "Articles", href: "/articles" },
        { name: "Experiences", href: "/experiences" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About Us", href: "/about-us" },
        { name: "Contact Us", href: "/contact-us" },
        { name: "Terms of Service", href: "/terms-of-use" },
        { name: "Privacy Policy", href: "/privacy-policy" },
      ],
    },
  ];

  const socialLinks = [
    {
      name: "Twitter",
      href: "https://twitter.com/DjMittzu",
      icon: (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/gappy_japantravel?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
      icon: (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12.017 1.946c2.983 0 3.372.012 4.563.066 1.102.05 1.702.215 2.1.356.526.205.901.45 1.297.846.396.396.641.771.846 1.297.141.398.306.998.356 2.1.054 1.191.066 1.58.066 4.563s-.012 3.372-.066 4.563c-.05 1.102-.215 1.702-.356 2.1a3.493 3.493 0 01-.846 1.297 3.493 3.493 0 01-1.297.846c-.398.141-.998.306-2.1.356-1.191.054-1.58.066-4.563.066s-3.372-.012-4.563-.066c-1.102-.05-1.702-.215-2.1-.356a3.493 3.493 0 01-1.297-.846 3.493 3.493 0 01-.846-1.297c-.141-.398-.306-.998-.356-2.1-.054-1.191-.066-1.58-.066-4.563s.012-3.372.066-4.563c.05-1.102.215-1.702.356-2.1.205-.526.45-.901.846-1.297.396-.396.771-.641 1.297-.846.398-.141.998-.306 2.1-.356 1.191-.054 1.58-.066 4.563-.066m0-1.838c-3.035 0-3.445.012-4.648.068-1.201.055-2.021.247-2.738.525-.741.288-1.37.673-1.997 1.3-.627.627-1.012 1.256-1.3 1.997-.278.717-.47 1.537-.525 2.738-.056 1.203-.068 1.613-.068 4.648s.012 3.445.068 4.648c.055 1.201.247 2.021.525 2.738.288.741.673 1.37 1.3 1.997.627.627 1.256 1.012 1.997 1.3.717.278 1.537.47 2.738.525 1.203.056 1.613.068 4.648.068s3.445-.012 4.648-.068c1.201-.055 2.021-.247 2.738-.525.741-.288 1.37-.673 1.997-1.3.627-.627 1.012-1.256 1.3-1.997.278-.717.47-1.537.525-2.738.056-1.203.068-1.613.068-4.648s-.012-3.445-.068-4.648c-.055-1.201-.247-2.021-.525-2.738a5.334 5.334 0 00-1.3-1.997c-.627-.627-1.256-1.012-1.997-1.3-.717-.278-1.537-.47-2.738-.525-1.203-.056-1.613-.068-4.648-.068z" />
          <path d="M12.017 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/share/1AUPxgd7oz/?mibextid=wwXIfr",
      icon: (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@kankankan0?_t=ZS-8ytZqkWYIvx&_r=1",
      icon: (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-.88-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
        </svg>
      ),
    },
    {
      name: "Discord",
      href: "https://discord.com/invite/2wYftbDG",
      icon: (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2518-.1918.3718-.2894a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.0976.246.1951.3728.2894a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gray-900 text-white pb-safe-bottom">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand information */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 relative">
                <Image
                  src="/gappy_icon.png"
                  alt="Gappy Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl sm:text-2xl text-[#36D879]">
                Gappy
              </span>
            </div>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6">
              Discover extraordinary experiences and events to make the most of
              your free time in Japan.
            </p>

            {/* Social links */}
            <div className="flex space-x-3 sm:space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-target bg-gray-800 rounded-lg p-2 sm:p-3 text-gray-400 hover:text-[#36D879] hover:bg-gray-700 transition-all duration-200 active:scale-95"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer links - hidden on xs/sm, visible on md and above */}
          {footerLinks.map((section) => (
            <div key={section.title} className="hidden md:block">
              <h3 className="font-semibold text-white mb-3 sm:mb-4 text-base sm:text-lg">
                {section.title}
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="touch-target text-gray-400 hover:text-[#36D879] transition-colors text-sm sm:text-base py-1"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Border line */}
        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-gray-400 text-xs sm:text-sm" suppressHydrationWarning>
              © {currentYear} Gappy. All rights reserved.
            </p>
            <div className="flex flex-row justify-center md:justify-end gap-4 sm:gap-6">
              <Link
                href="/about-us"
                className="text-gray-400 hover:text-[#36D879] transition-colors text-xs sm:text-sm touch-target"
              >
                About Us
              </Link>
              <Link
                href="/contact-us"
                className="text-gray-400 hover:text-[#36D879] transition-colors text-xs sm:text-sm touch-target"
              >
                Contact Us
              </Link>
              <Link
                href="/terms-of-use"
                className="text-gray-400 hover:text-[#36D879] transition-colors text-xs sm:text-sm touch-target"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                className="text-gray-400 hover:text-[#36D879] transition-colors text-xs sm:text-sm touch-target"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Back to top button - Mobile only */}
        <div className="mt-6 text-center sm:hidden">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="btn-mobile-secondary flex items-center gap-2 mx-auto"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            Back to Top
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
 