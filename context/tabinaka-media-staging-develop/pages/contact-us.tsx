import { NextPage } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

const ContactUsPage: NextPage = () => {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>{t("pages.contactUs.title")} | Gappy</title>
        <meta name="description" content={t("pages.contactUs.subtitle")} />
        <link rel="canonical" href="https://gappytravel.com/contact-us" />
      </Head>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 no-hero-styles">
          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-center text-gray-900">
              {t("pages.contactUs.title")}
            </h1>
            <p className="text-lg text-center max-w-3xl mx-auto text-gray-700">
              {t("pages.contactUs.subtitle")}
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8 text-gray-900">
            <div className="max-w-3xl mx-auto space-y-8 text-gray-900">
              {/* Phone Contact */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("pages.contactUs.otherMethods.phone.title")}
                </h3>
                <p className="text-gray-900 mb-3">
                  {t("pages.contactUs.otherMethods.phone.description")}
                </p>
                <a
                  href="tel:070-1185-3131"
                  className="text-[#36D879] hover:text-emerald-600 font-semibold text-lg"
                >
                  070-1185-3131
                </a>
              </div>

              {/* Email Contact */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("pages.contactUs.otherMethods.email.title")}
                </h3>
                <p className="text-gray-900 mb-3">
                  {t("pages.contactUs.otherMethods.email.description")}
                </p>
                <a
                  href="mailto:mitsuki@gappy.jp"
                  className="text-[#36D879] hover:text-emerald-600 font-semibold text-lg break-all"
                >
                  mitsuki@gappy.jp
                </a>
              </div>

              {/* Response Time */}
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-900 text-center">
                  {t("pages.contactUs.form.description")}
                  <span className="font-semibold text-[#36D879]">
                    {t("pages.contactUs.form.responseTime")}
                  </span>
                  {t("pages.contactUs.form.responseTimeEnd")}
                </p>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 text-gray-900">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">
              {t("pages.contactUs.companyInfo.title")}
            </h2>
            <div className="max-w-3xl mx-auto space-y-6 text-gray-900">
              {/* Basic Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("pages.contactUs.companyInfo.basic.title")}
                </h3>
                <div className="space-y-2 text-gray-900">
                  <p>{t("pages.contactUs.companyInfo.basic.companyName")}</p>
                  <p>{t("pages.contactUs.companyInfo.basic.president")}</p>
                  <p>{t("pages.contactUs.companyInfo.basic.business")}</p>
                </div>
              </div>

              {/* Location and Contact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("pages.contactUs.companyInfo.location.title")}
                </h3>
                <div className="space-y-2 text-gray-900">
                  <p className="font-semibold text-gray-900">
                    {t("pages.contactUs.companyInfo.location.address")}
                  </p>
                  <p>{t("pages.contactUs.companyInfo.location.postalCode")}</p>
                  <p>
                    {t("pages.contactUs.companyInfo.location.addressLine1")}
                  </p>
                  <p>
                    {t("pages.contactUs.companyInfo.location.addressLine2")}
                  </p>
                  <div className="pt-4 space-y-2">
                    <p className="text-gray-900">
                      <span className="font-semibold text-gray-900">
                        {t("pages.contactUs.companyInfo.location.phone")}
                      </span>
                      <a
                        href="tel:070-1185-3131"
                        className="ml-2 text-[#36D879] hover:text-emerald-600"
                      >
                        070-1185-3131
                      </a>
                    </p>
                    <p className="text-gray-900">
                      <span className="font-semibold text-gray-900">
                        {t("pages.contactUs.companyInfo.location.email")}
                      </span>
                      <a
                        href="mailto:mitsuki@gappy.jp"
                        className="ml-2 text-[#36D879] hover:text-emerald-600 break-all"
                      >
                        mitsuki@gappy.jp
                      </a>
                    </p>
                  </div>
                </div>
              </div>
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

export default ContactUsPage;
