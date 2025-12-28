import React from "react";

export type StructuredDataObject = Record<string, unknown>;

interface SeoStructuredDataProps {
  data: StructuredDataObject[];
}

function serializeStructuredData(payload: StructuredDataObject) {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn(
      "[SeoStructuredData] Failed to stringify structured data payload",
      error,
    );
    return '""';
  }
}

export const SeoStructuredData: React.FC<SeoStructuredDataProps> = ({
  data,
}) => {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  return (
    <>
      {data.map((payload, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: serializeStructuredData(payload) }}
          key={`structured-data-${index}`}
          type="application/ld+json"
        />
      ))}
    </>
  );
};

export default SeoStructuredData;
