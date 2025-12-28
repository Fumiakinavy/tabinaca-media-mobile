import { NextPage } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

const AboutUsPage: NextPage = () => {
  const { t } = useTranslation("common");

  return (
    <>
      <Head>
        <title>{t("pages.about.title")} | Gappy</title>
        <meta name="description" content={t("pages.about.subtitle")} />
        <link rel="canonical" href="https://gappytravel.com/about-us" />
      </Head>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 no-hero-styles">
          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-center text-gray-900">
              {t("pages.about.title")}
            </h1>
            <p className="text-lg text-center max-w-3xl mx-auto text-gray-700">
              {t("pages.about.subtitle")}
            </p>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8 text-gray-900">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
              {t("pages.about.companyInfo.title")}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody className="text-gray-900">
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50 w-1/3">
                      {t("pages.about.companyInfo.companyName")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.companyNameValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.englishName")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.englishNameValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.capital")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.capitalValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.president")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.presidentValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.address")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.addressValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.business")}
                    </td>
                    <td className="py-4 px-4">
                      <ul className="list-disc list-inside space-y-1">
                        <li>{t("pages.about.companyInfo.businessValue1")}</li>
                        <li>{t("pages.about.companyInfo.businessValue2")}</li>
                        <li>{t("pages.about.companyInfo.businessValue3")}</li>
                      </ul>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.employees")}
                    </td>
                    <td className="py-4 px-4">
                      {t("pages.about.companyInfo.employeesValue")}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.contact")}
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div>
                          {t("pages.about.companyInfo.tel")}: 070-1185-3131
                        </div>
                        <div>
                          {t("pages.about.companyInfo.email")}:{" "}
                          <a
                            href="mailto:mitsuki@gappy.jp"
                            className="text-[#36D879] hover:underline"
                          >
                            mitsuki@gappy.jp
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-semibold bg-gray-50">
                      {t("pages.about.companyInfo.website")}
                    </td>
                    <td className="py-4 px-4">
                      <a
                        href="https://gappy.jp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#36D879] hover:underline"
                      >
                        https://gappy.jp
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8 text-gray-900">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
              {t("pages.about.team.title")}
            </h2>
            <div className="space-y-8 text-gray-900">
              {/* CEO */}
              <div className="border-b border-gray-200 pb-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t("pages.about.team.ceo.name")}
                    </h3>
                    <p className="text-[#36D879] font-semibold mb-4">
                      {t("pages.about.team.ceo.title")}
                    </p>
                  </div>
                  <div className="md:w-2/3">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {t("pages.about.team.ceo.role")}
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-900">
                      <li className="text-gray-900">
                        {t("pages.about.team.ceo.responsibility1")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.ceo.responsibility2")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.ceo.responsibility3")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.ceo.responsibility4")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.ceo.responsibility5")}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTO */}
              <div className="border-b border-gray-200 pb-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t("pages.about.team.cto.name")}
                    </h3>
                    <p className="text-[#36D879] font-semibold mb-4">
                      {t("pages.about.team.cto.title")}
                    </p>
                  </div>
                  <div className="md:w-2/3">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {t("pages.about.team.cto.role")}
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-900">
                      <li className="text-gray-900">
                        {t("pages.about.team.cto.responsibility1")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.cto.responsibility2")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.cto.responsibility3")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.cto.responsibility4")}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Operations */}
              <div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t("pages.about.team.operations.name")}
                    </h3>
                    <p className="text-[#36D879] font-semibold mb-4">
                      {t("pages.about.team.operations.title")}
                    </p>
                  </div>
                  <div className="md:w-2/3">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {t("pages.about.team.operations.role")}
                    </h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-900">
                      <li className="text-gray-900">
                        {t("pages.about.team.operations.responsibility1")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.operations.responsibility2")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.operations.responsibility3")}
                      </li>
                      <li className="text-gray-900">
                        {t("pages.about.team.operations.responsibility4")}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8 text-gray-900">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
              {t("pages.about.history.title")}
            </h2>
            <div className="space-y-6 text-gray-900">
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event1.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event1.description")}
                </div>
              </div>
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event2.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event2.description")}
                </div>
              </div>
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event3.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event3.description")}
                </div>
              </div>
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event4.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event4.description")}
                </div>
              </div>
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event5.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event5.description")}
                </div>
              </div>
              <div className="flex gap-4 border-l-4 border-[#36D879] pl-4">
                <div className="min-w-[120px] font-semibold text-[#36D879]">
                  {t("pages.about.history.event6.date")}
                </div>
                <div className="text-gray-900">
                  {t("pages.about.history.event6.description")}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gray-50 rounded-lg shadow-lg p-8 md:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">
              {t("pages.about.cta.title")}
            </h2>
            <p className="text-lg mb-6 text-gray-700">{t("pages.about.cta.description")}</p>
            <Link
              href="/contact-us"
              className="inline-block bg-[#36D879] text-white font-semibold px-8 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {t("footer.links.contact")}
            </Link>
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

export default AboutUsPage;
