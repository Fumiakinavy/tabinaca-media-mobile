/**
 * Structured Data Provider Component
 * Extracted from _app.tsx for better organization
 */

import { useMemo } from "react";
import SeoStructuredData from "@/components/SeoStructuredData";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "@/lib/structuredData";

interface StructuredDataProviderProps {
  contactEmail?: string;
}

export default function StructuredDataProvider({
  contactEmail = "support@gappy.jp"
}: StructuredDataProviderProps) {
  const globalStructuredData = useMemo(
    () => [
      buildWebsiteStructuredData(),
      buildOrganizationStructuredData({ contactEmail }),
    ],
    [contactEmail],
  );

  return <SeoStructuredData data={globalStructuredData} />;
}
