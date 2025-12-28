import { searchPlaces } from "./lib/functionRegistry";

(async () => {
  const result = await searchPlaces({
    query: "Experience Sightseeing at Shibuya Crossing",
  });
  console.log("status: success, count=", result.results.length);
  console.log(result.results.map((r) => r.name).slice(0, 5));
})();
