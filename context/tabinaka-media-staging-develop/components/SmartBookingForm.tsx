"use client";
import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, signInWithGoogle } from "@/lib/supabaseAuth";
import { announceToScreenReader } from "@/lib/accessibility";
import { sendGA } from "@/lib/ga";
import { getAuthRedirectUrl } from "@/lib/env";
import { COUNTRY_PHONE_MAP } from "@/lib/constants/countries";

// 国名オートコンプリートコンポーネント
const CountryAutocomplete: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onCountrySelect: (country: (typeof COUNTRY_PHONE_MAP)[0]) => void;
  selectedCountry?: (typeof COUNTRY_PHONE_MAP)[0];
}> = ({ value, onChange, onCountrySelect, selectedCountry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCountries, setFilteredCountries] = useState<
    typeof COUNTRY_PHONE_MAP
  >([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (newValue.trim() === "") {
      setFilteredCountries([]);
      setIsOpen(false);
      return;
    }

    const filtered = COUNTRY_PHONE_MAP.filter((country) =>
      country.name.toLowerCase().includes(newValue.toLowerCase()),
    );
    setFilteredCountries(filtered);
    setIsOpen(filtered.length > 0);
  };

  const handleCountryClick = (country: (typeof COUNTRY_PHONE_MAP)[0]) => {
    onChange(country.name);
    onCountrySelect(country);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredCountries.length > 0) {
      e.preventDefault();
      handleCountryClick(filteredCountries[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim() !== "" && filteredCountries.length > 0) {
            setIsOpen(true);
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Type country name..."
        autoComplete="off"
      />
      {isOpen && filteredCountries.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredCountries.map((country, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2"
              onClick={() => handleCountryClick(country)}
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
              <span className="text-gray-500 ml-auto">{country.phone}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// フォームバリデーションスキーマ
const smartFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      return val && val.startsWith("+") && val.length >= 8;
    }, "Please enter a valid international phone number"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy and terms of use",
  }),
});

type SmartFormData = z.infer<typeof smartFormSchema>;

interface SmartBookingFormProps {
  experienceSlug: string;
  experienceTitle: string;
  onSuccess?: () => void;
}

const SmartBookingForm: React.FC<SmartBookingFormProps> = ({
  experienceSlug,
  experienceTitle,
  onSuccess,
}) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<
    (typeof COUNTRY_PHONE_MAP)[0] | null
  >(null);
  const [countryName, setCountryName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<SmartFormData>({
    resolver: zodResolver(smartFormSchema),
    mode: "onChange",
  });

  const watchedFields = watch();

  // ユーザーセッションを監視
  useEffect(() => {
    // 初回のユーザー取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsInitialized(true);
    });

    // セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ログイン後の処理
  useEffect(() => {
    if (user && isInitialized) {
      // ユーザー情報から基本情報を自動入力
      const userEmail = user.email;
      const userPhone = user.user_metadata?.phone_number;
      const userName =
        user.user_metadata?.full_name || user.user_metadata?.name;

      if (userEmail) {
        setValue("email", userEmail);
      }

      if (userName) {
        const nameParts = userName.split(" ");
        if (nameParts.length > 0) {
          setValue("firstName", nameParts[0]);
          if (nameParts.length > 1) {
            setValue("lastName", nameParts.slice(1).join(" "));
          }
        }
      }

      // 電話番号の処理を改善
      if (userPhone && userPhone.startsWith("+")) {
        setValue("phoneNumber", userPhone);
        // 電話番号がある場合は即座に予約完了
        setTimeout(() => {
          handleDirectBooking();
        }, 500); // 少し遅延させてフォームの更新を待つ
      } else {
        setShowPhoneForm(true);
      }
    }
    // handleDirectBookingは状態更新関数で安定しているため、依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialized, setValue]);

  const handleGoNow = async () => {
    if (!isInitialized) return;

    setIsLoading(true);

    try {
      if (user) {
        // ログイン済み: 電話番号確認または即座に予約
        const userPhone = user.user_metadata?.phone_number;
        if (userPhone) {
          setValue("phoneNumber", userPhone);
          handleDirectBooking();
        } else {
          setShowPhoneForm(true);
        }
      } else {
        // 未ログイン: Googleログイン（自動リダイレクトURL使用）
        const currentUrl =
          typeof window !== "undefined" ? window.location.href : "";
        const redirectUrl = getAuthRedirectUrl(currentUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
          },
        });

        if (error) {
          console.error("Sign in error:", error);
          setError("Login failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Want to Go error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectBooking = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = {
        experience_slug: experienceSlug,
        experience_title: experienceTitle,
        email: user.email,
        phone_number:
          watchedFields.phoneNumber || user.user_metadata?.phone_number,
        first_name:
          watchedFields.firstName ||
          user.user_metadata?.full_name?.split(" ")[0] ||
          "",
        last_name:
          watchedFields.lastName ||
          user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
          "",
        notes: `Smart booking for ${experienceTitle} - User: ${user.email}`,
      };

      const response = await fetch("/api/form-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      // GA4イベント送信
      sendGA("smart_booking_success", {
        experience_slug: experienceSlug,
        experience_title: experienceTitle,
        user_id: user.id,
        booking_method: "direct",
        timestamp: new Date().toISOString(),
      });

      setIsSuccess(true);
      announceToScreenReader("Booking completed successfully!");

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 100);
    } catch (err) {
      console.error("Direct booking error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Booking failed. Please try again.";
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit: SubmitHandler<SmartFormData> = async (data) => {
    setIsSubmitting(true);
    setError(null);
    announceToScreenReader("Submitting form...");

    try {
      const formData = {
        experience_slug: experienceSlug,
        experience_title: experienceTitle,
        email: data.email,
        phone_number: data.phoneNumber,
        first_name: data.firstName || "",
        last_name: data.lastName || "",
        notes: `Smart form submitted for ${experienceTitle}`,
      };

      const response = await fetch("/api/form-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      // GA4イベント送信
      sendGA("smart_booking_success", {
        experience_slug: experienceSlug,
        experience_title: experienceTitle,
        user_id: user?.id || "anonymous",
        booking_method: "form",
        timestamp: new Date().toISOString(),
      });

      setIsSuccess(true);
      announceToScreenReader("Booking completed successfully!");

      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 100);
    } catch (err) {
      console.error("Form submission error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.";
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Booking Complete!
        </h3>
        <p className="text-gray-600 mb-4">
          We've sent you detailed information about {experienceTitle} via email.
          Please check your inbox.
        </p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setShowPhoneForm(false);
          }}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors mt-6"
        >
          Close
        </button>
      </div>
    );
  }

  // ログイン済みで電話番号入力が必要な場合
  if (showPhoneForm) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Please enter your phone number
        </h2>
        <p className="text-center text-gray-600 mb-6">
          A phone number is required to complete your booking.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Country *
                </label>
                <CountryAutocomplete
                  value={countryName}
                  onChange={setCountryName}
                  onCountrySelect={(country) => {
                    setSelectedCountry(country);
                    setValue("phoneNumber", country.phone);
                  }}
                  selectedCountry={selectedCountry ?? undefined}
                />
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number *
                </label>
                <div className="flex">
                  <div className="flex-shrink-0 px-3 py-2 bg-gray-100 border border-gray-300 border-r-0 rounded-l-md text-sm text-gray-600 flex items-center">
                    {selectedCountry ? (
                      <span className="flex items-center gap-1">
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.phone}</span>
                      </span>
                    ) : (
                      <span>Select country first</span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      const fullNumber = selectedCountry
                        ? `${selectedCountry.phone}${e.target.value}`
                        : e.target.value;
                      setValue("phoneNumber", fullNumber);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your phone number"
                    disabled={!selectedCountry}
                  />
                </div>
                {!selectedCountry && (
                  <p className="mt-1 text-sm text-gray-500">
                    Please select a country first
                  </p>
                )}
                {errors.phoneNumber && (
                  <p
                    id="phoneNumber-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start bg-gray-50 border border-gray-200 rounded-lg p-4">
              <input
                id="agreeToTerms"
                type="checkbox"
                {...register("agreeToTerms")}
                className="mt-1 mr-3 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                aria-describedby="agreeToTerms-error"
              />
              <label
                htmlFor="agreeToTerms"
                className="text-sm font-medium text-gray-800 leading-relaxed"
              >
                I agree to the{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline font-semibold"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline font-semibold"
                >
                  Terms of Use
                </a>{" "}
                <span className="text-red-500 font-bold">*</span>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p
                id="agreeToTerms-error"
                className="text-sm text-red-600"
                role="alert"
              >
                {errors.agreeToTerms.message}
              </p>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowPhoneForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Complete Booking"}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // メインのWant to Goボタン
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Want to Go !</h2>
      <p className="text-gray-600 mb-6">
        We'll send you detailed information about {experienceTitle} via email!
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleGoNow}
        disabled={isLoading || isSubmitting}
        className="w-full bg-green-500 text-white px-8 py-3 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </div>
        ) : user ? (
          "Complete Registration"
        ) : (
          "Login with Google to Continue"
        )}
      </button>

      {user && (
        <p className="text-sm text-gray-500 mt-4">Logged in: {user.email}</p>
      )}
    </div>
  );
};

export default SmartBookingForm;
