import { searchPlaces } from "./lib/functionRegistry";

(async () => {
  const result = await searchPlaces({
    query: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz in the moon",
  });
  console.log("status: success, count=", result.results.length);
})();
