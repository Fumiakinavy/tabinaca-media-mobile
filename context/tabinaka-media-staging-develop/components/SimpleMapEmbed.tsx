interface SimpleMapEmbedProps {
  iframeHtml?: string; // MDXから直接iframeを受け取る
  lat?: number; // 後方互換性のため残す
  lng?: number; // 後方互換性のため残す
  storeName?: string; // 後方互換性のため残す
  storeNameEn?: string; // 後方互換性のため残す
  address?: string; // 後方互換性のため残す
  className?: string;
  userLocation?: { lat: number; lng: number }; // 後方互換性のため残す
  zoom?: number; // 後方互換性のため残す
  usePlaceSearch?: boolean; // 後方互換性のため残す
}

const SimpleMapEmbed: React.FC<SimpleMapEmbedProps> = ({
  iframeHtml,
  lat,
  lng,
  storeName = "Store Location",
  storeNameEn,
  address,
  className = "",
  userLocation,
  zoom = 16,
  usePlaceSearch = false,
}) => {
  // iframeHtmlが提供されている場合はそれを直接使用（APIキー不要）
  if (iframeHtml) {
    // 静的iframeの場合はそのまま使用
    const isStaticIframe =
      !iframeHtml.includes("YOUR_API_KEY") && !iframeHtml.includes("key=");

    if (isStaticIframe) {
      return (
        <div className={`w-full ${className} relative z-0`}>
          <div className="relative w-full h-64 border border-gray-300 rounded-lg overflow-hidden">
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: iframeHtml }}
            />
          </div>
        </div>
      );
    }

    // APIキーが必要な場合のみAPIキーを使用
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      const processedIframeHtml = iframeHtml.replace(/YOUR_API_KEY/g, apiKey);
      return (
        <div className={`w-full ${className} relative z-0`}>
          <div className="relative w-full h-64 border border-gray-300 rounded-lg overflow-hidden">
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: processedIframeHtml }}
            />
          </div>
        </div>
      );
    }
  }

  // 後方互換性のため、既存のロジックも残す
  const displayStoreName = storeNameEn || storeName;

  // APIキーなしで静的URLを生成（デフォルト）
  let mapEmbedUrl: string;

  if (usePlaceSearch) {
    // 場所検索の場合は静的URLを使用
    const placeQuery = encodeURIComponent(displayStoreName);
    mapEmbedUrl = `https://www.google.com/maps?q=${placeQuery}&hl=en&output=embed`;
  } else if (lat && lng) {
    // 座標がある場合は静的URLを使用
    mapEmbedUrl = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&hl=en&output=embed`;
  } else {
    // フォールバック
    mapEmbedUrl = `https://www.google.com/maps?hl=en&output=embed`;
  }

  const directionsUrl =
    userLocation && lat && lng
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${lat},${lng}&travelmode=walking&hl=en`
      : undefined;

  const fullMapUrl = usePlaceSearch
    ? `https://www.google.com/maps?q=${encodeURIComponent(displayStoreName)}&hl=en`
    : `https://www.google.com/maps?q=${lat},${lng}&hl=en`;

  return (
    <div className={`w-full ${className} relative z-0`}>
      <div className="relative w-full h-64 border border-gray-300 rounded-lg overflow-hidden cursor-pointer group">
        <iframe
          src={mapEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${displayStoreName}`}
        />

        <div
          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center"
          onClick={() => {
            window.open(fullMapUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="text-sm font-medium text-gray-800">
              Tap to open map
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-1">{displayStoreName}</h4>
        {address && <p className="text-sm text-gray-600 mb-2">{address}</p>}
        {!usePlaceSearch && lat && lng && (
          <p className="text-xs text-gray-500">
            Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        )}
        {usePlaceSearch && (
          <p className="text-xs text-gray-500">Search-based location</p>
        )}
      </div>

      {directionsUrl && (
        <div className="mt-3 text-center">
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            ▶ Get Directions from Current Location
          </a>
        </div>
      )}
    </div>
  );
};

export default SimpleMapEmbed;

/*
使用例:

import SimpleMapEmbed from '@/components/SimpleMapEmbed';

// 新しい方式：静的iframeを直接使用（APIキー不要）
<SimpleMapEmbed 
  iframeHtml={`
    <iframe
      width="600"
      height="450"
      frameborder="0"
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.69209850699!2d139.70117107643412!3d35.659956931141245!2m3!1f0!2f0!3f0!3m2!1sen!2sjp!4f13.1!3m3!1m2!1s0x60188b5861a076bf%3A0xe557882c96cad475!2z44Gh44GP44Gh44GPQ0FGRQ!5e0!3m2!1sen!2sjp!4v1753794539896!5m2!1sen!2sjp&language=en&region=JP"
      allowfullscreen>
    </iframe>
  `}
  className="mb-6"
/>

// 後方互換性：既存の方式も引き続き使用可能（APIキー不要）
<SimpleMapEmbed 
  lat={35.664293} 
  lng={139.6939212} 
  storeName="SENSUOUS"
  storeNameEn="SENSUOUS"
  address="〒150-0042 東京都渋谷区宇田川町２９−２"
  zoom={17}
  className="mb-6"
/>
*/
