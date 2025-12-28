import { NextPage } from "next";
import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

const PrivacyPolicyPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy | Gappy</title>
        <meta name="description" content="Gappyのプライバシーポリシー" />
        <link
          rel="canonical"
          href="https://gappytravel.com/privacy-policy"
        />
      </Head>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-center">
              Privacy Policy
            </h1>
            <div className="prose prose-lg max-w-none mx-auto text-gray-700">
              <p>Last Updated: 2025年7月19日</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Introduction
              </h2>
              <p>
                Welcome to Gappy! We are committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and
                protect your information when you use our website and services.
                Please read this Privacy Policy carefully. If you do not agree
                with the terms of this Privacy Policy, please do not access the
                site.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Information We Collect
              </h2>
              <p>
                We may collect information about you in various ways. The
                information we may collect on the site includes:
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-2">
                Personal Data
              </h3>
              <p>
                Personally identifiable information such as your name, email
                address, and demographic information (such as age and nationality)
                that you voluntarily provide when registering for coupons or
                interacting with the site.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-2">
                Derivative Data
              </h3>
              <p>
                Information our servers automatically collect when you access the
                site, such as your IP address, browser type, operating system,
                access times, and the pages you viewed immediately before and
                after accessing the site.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Use of Your Information
              </h2>
              <p>
                Having accurate information about you enables us to provide you
                with a smooth, efficient, and customized experience. Specifically,
                we may use information collected about you via the site to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Send requested coupons via email</li>
                <li>Create and manage your account</li>
                <li>Generate anonymous statistical data and analytics for internal use</li>
                <li>Improve the efficiency and operation of the site</li>
                <li>Monitor and analyze usage and trends to improve your experience on the site</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Disclosure of Your Information
              </h2>
              <p>
                We may share information we have collected about you in certain
                situations. Your information may be disclosed as follows:
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-2">
                By Law or to Protect Rights
              </h3>
              <p>
                If we believe the release of information about you is necessary
                to respond to legal process, to investigate or remedy potential
                violations of our policies, or to protect the rights, property,
                and safety of others, we may share your information as permitted
                or required by applicable law, rule, or regulation.
              </p>
              <h3 className="text-xl font-semibold mt-4 mb-2">
                Third-Party Service Providers
              </h3>
              <p>
                We may share your information with third parties that perform
                services for us or on our behalf, including data analysis, email
                delivery, hosting services, and customer service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">
                Contact Us
              </h2>
              <p>
                If you have questions or comments about this Privacy Policy,
                please contact us at: info@gappy.jp
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicyPage;
