import { NextPage } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

const TermsOfUsePage: NextPage = () => {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>{t("pages.terms.title")} | Gappy</title>
        <meta name="description" content={t("pages.terms.title")} />
        <link rel="canonical" href="https://gappytravel.com/terms-of-use" />
      </Head>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 no-hero-styles">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
              Terms of Service
            </h1>
            <p className="text-center text-gray-600 mb-8">
              {t("pages.terms.lastUpdated")}: December 24, 2025
            </p>

            <div className="space-y-8 text-gray-700">
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.introduction.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.introduction.content")}</p>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.serviceDescription.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.serviceDescription.content")}</p>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.userAccounts.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.userAccounts.content")}</p>
              </section>

              {/* Section 4 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.useOfService.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.useOfService.content")}</p>
              </section>

              {/* Section 5 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.couponsAndBookings.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.couponsAndBookings.content")}</p>
              </section>

              {/* Section 6 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.intellectualProperty.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.intellectualProperty.content")}</p>
              </section>

              {/* Section 7 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.disclaimers.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.disclaimers.content")}</p>
              </section>

              {/* Section 8 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.limitationOfLiability.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.limitationOfLiability.content")}</p>
              </section>

              {/* Section 9 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.modifications.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.modifications.content")}</p>
              </section>

              {/* Section 10 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.governingLaw.title")}
                </h2>
                <p className="leading-relaxed">{t("pages.terms.governingLaw.content")}</p>
              </section>

              {/* Section 11 */}
              <section>
                <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">
                  {t("pages.terms.contact.title")}
                </h2>
                <p className="leading-relaxed">
                  {t("pages.terms.contact.content")}{" "}
                  <a
                    href="mailto:mitsuki@gappy.jp"
                    className="text-[#36D879] hover:underline font-medium"
                  >
                    mitsuki@gappy.jp
                  </a>
                </p>
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export const getStaticProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale, ["common", "footer"])),
  },
});

export default TermsOfUsePage;
