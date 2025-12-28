import { searchPlaces } from "./lib/functionRegistry";

(async () => {
  const result = await searchPlaces({ query: "coffee in shibuya" });
  console.log("status: success, count=", result.results.length);
})();
