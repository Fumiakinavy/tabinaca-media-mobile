import { GetServerSideProps } from "next";
import Head from "next/head";
import { supabaseServer } from "@/lib/supabaseServer";
import { cookieNameForVendor, verifyToken } from "@/lib/vendorAuth";
import { useMemo } from "react";

type Visit = {
  booking_id: string;
  coupon_code: string;
  activity_name: string;
  experience_slug: string;
  user_name: string;
  user_email: string;
  party_size: number;
  completed_at: string;
};

interface Props {
  slug: string;
  visits: Visit[];
  requireAuth?: boolean;
}

export default function VisitsPage({ slug, visits, requireAuth }: Props) {
  const rows = useMemo(() => visits || [], [visits]);

  if (requireAuth) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Head>
          <title>Vendor Login | Gappy</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="max-w-md mx-auto">
          <div className="bg-white p-6 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              このページを表示するにはQRページでログインしてください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>来店履歴 - Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="bg-green-600 text-white rounded-t-lg p-4">
          <h1 className="text-lg font-bold">来店履歴</h1>
          <p className="text-xs opacity-90">{slug}</p>
        </div>
        <div className="bg-white border-x border-b border-gray-200 p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4 font-medium">完了日時</th>
                  <th className="py-2 pr-4 font-medium">予約者</th>
                  <th className="py-2 pr-4 font-medium">人数</th>
                  <th className="py-2 pr-4 font-medium">体験</th>
                  <th className="py-2 pr-4 font-medium">予約ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={5}>
                      データがありません
                    </td>
                  </tr>
                ) : (
                  rows.map((v) => (
                    <tr
                      key={`${v.booking_id}-${v.coupon_code}`}
                      className="border-t border-gray-100"
                    >
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {new Date(v.completed_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">{v.user_name}</td>
                      <td className="py-2 pr-4">{v.party_size}</td>
                      <td className="py-2 pr-4">{v.activity_name}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {v.booking_id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-4">
          <a
            href="/"
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ← Gappyホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug =
    (ctx.query.slug as string) || (ctx.query.activity as string) || "";

  // slug がなければエラー
  if (!slug) {
    return { props: { slug: "", visits: [], requireAuth: true } };
  }

  // Cookie 認証
  let requireAuth = false;
  try {
    const cookieHeader = ctx.req.headers.cookie || "";
    const name = cookieNameForVendor(slug);
    const match = cookieHeader
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`));
    if (match) {
      const token = match.split("=")[1];
      const payload = verifyToken(token);
      if (!payload || payload.vendorId !== slug) requireAuth = true;
    } else {
      requireAuth = true;
    }
  } catch {
    requireAuth = true;
  }

  if (requireAuth) {
    return { props: { slug, visits: [], requireAuth } };
  }

  const { data, error } = await supabaseServer
    .from("activity_completions")
    .select(
      `
      booking_id,
      coupon_code,
      activity_name,
      experience_slug,
      user_name,
      user_email,
      party_size,
      completed_at
    `,
    )
    .eq("experience_slug", slug)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (error) {
    return { props: { slug, visits: [], requireAuth: false } };
  }

  return {
    props: {
      slug,
      visits: data || [],
      requireAuth: false,
    },
  };
};
