import {
  validateEnvironmentVariables,
  validateServerEnvironmentVariables,
  validateClientEnvironmentVariables,
} from "../lib/env";

type ValidationResult = {
  isValid: boolean;
  missing: string[];
  errors: string[];
};

const logSection = (title: string, result: ValidationResult) => {
  const status = result.isValid ? "OK" : "NG";
  console.log(`${title}: ${status}`);

  if (result.missing.length > 0) {
    console.log(`  Missing: ${result.missing.join(", ")}`);
  }

  if (result.errors.length > 0) {
    console.log("  Errors:");
    result.errors.forEach((error) => console.log(`    - ${error}`));
  }
};

async function main() {
  const server = validateServerEnvironmentVariables();
  const client = validateClientEnvironmentVariables();
  const combined = validateEnvironmentVariables();

  logSection("Server variables", server);
  logSection("Client variables", client);

  if (!combined.isValid) {
    console.log("");
    console.error(
      "❌ Required environment variables are missing. Please supply the values above before continuing.",
    );
    process.exit(1);
  }

  console.log("");
  console.log("✅ All required environment variables are set");
}

main().catch((error) => {
  console.error("Environment check failed with an unexpected error");
  console.error(error);
  process.exit(1);
});
