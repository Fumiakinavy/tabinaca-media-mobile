import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { announceToScreenReader } from "@/lib/accessibility";
import { COUNTRIES_SHORT as COUNTRIES } from "@/lib/constants/countries";
import { FormSubmission } from "@/types/experiences-db";

// GA4イベント送信関数
const sendGA4Event = (
  eventName: string,
  parameters: Record<string, any> = {},
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, parameters);
  }
};

// オートコンプリートコンポーネント
const AutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  id: string;
  label: string;
  isOptional?: boolean;
  register: any;
  name: string;
}> = ({
  value,
  onChange,
  options,
  placeholder,
  id,
  label,
  isOptional = false,
  register,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
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
      setFilteredOptions([]);
      setIsOpen(false);
      return;
    }

    const filtered = options.filter((option) =>
      option.toLowerCase().includes(newValue.toLowerCase()),
    );
    setFilteredOptions(filtered);
    setIsOpen(filtered.length > 0);
  };

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      handleOptionClick(filteredOptions[0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}{" "}
        {isOptional && <span className="text-gray-500">(Optional)</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (value.trim() !== "" && filteredOptions.length > 0) {
            setIsOpen(true);
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Form validation schemas
const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => {
      // 基本的な電話番号形式チェック（+で始まり、数字が含まれる）
      return val && val.startsWith("+") && val.length >= 8;
    }, "Please enter a valid international phone number"),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the privacy policy and terms of use",
  }),
});

const step2Schema = z.object({
  nationality: z.string().optional(),
  ageGroup: z.string().optional(),
  visitPurpose: z.array(z.string()).optional(),
  stayDuration: z.string().optional(),
  travelIssues: z.string().optional(),
  howDidYouFind: z.string().optional(),
  howDidYouFindOther: z.string().optional(),
});

const fullFormSchema = step1Schema.merge(step2Schema);

type FormData = z.infer<typeof fullFormSchema>;

const AGE_GROUPS = [
  "Under 19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60 and above",
];

const VISIT_PURPOSES = [
  "Sightseeing",
  "Business",
  "Study",
  "Visiting friends/family",
  "Shopping",
  "Food & Dining",
  "Culture & History",
  "Nature & Outdoor",
  "Events & Festivals",
  "Other",
];

const STAY_DURATIONS = [
  "1-3 days",
  "4-7 days",
  "1-2 weeks",
  "2-4 weeks",
  "More than 1 month",
];

const HOW_FOUND_OPTIONS = [
  "Google Search",
  "Social Media (Instagram, Facebook, etc.)",
  "Travel Blog/Website",
  "YouTube",
  "Friend/Family Recommendation",
  "Travel Agency",
  "Other",
];

interface ExperienceFormProps {
  experienceSlug: string;
  experienceTitle: string;
  mode?: "coupon" | "shibuyapass";
  onSuccess?: () => void;
}

const ExperienceForm: React.FC<ExperienceFormProps> = ({
  experienceSlug,
  experienceTitle,
  mode = "coupon",
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreQuestions, setShowMoreQuestions] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(
      currentStep === 1
        ? step1Schema
        : currentStep === 3
          ? step1Schema
          : fullFormSchema,
    ),
    mode: "onChange",
  });

  const watchedFields = watch();

  const nextStep = async () => {
    const isStepValid = await trigger([
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "agreeToTerms",
    ]);
    if (isStepValid) {
      // GA4イベント: フォームステップ1完了
      sendGA4Event("form_step_completed", {
        step: 1,
        experience_slug: experienceSlug,
        experience_title: experienceTitle,
        form_type: mode,
        page_location: window.location.pathname,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
      });
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(1);
  };

  const goToConfirmation = () => {
    setCurrentStep(3);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    setError(null);
    announceToScreenReader("Submitting form...");

    try {
      // GA4イベント: フォーム送信開始（非同期で送信）
      setTimeout(() => {
        sendGA4Event("form_submit_start", {
          experience_slug: experienceSlug,
          experience_title: experienceTitle,
          form_type: mode,
          page_location: window.location.pathname,
          user_country: data.nationality,
          user_age_group: data.ageGroup,
          visit_purposes: data.visitPurpose,
          stay_duration: data.stayDuration,
          how_did_you_find: data.howDidYouFind,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        });
      }, 0);

      const response = await fetch("/api/form-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // 必須項目
          experience_slug: experienceSlug,
          experience_title: experienceTitle,
          email: data.email,
          phone_number: data.phoneNumber,

          // オプション項目
          first_name: data.firstName,
          last_name: data.lastName,
          country: data.nationality,
          nationality: data.nationality,
          age_group: data.ageGroup,
          visit_purposes: data.visitPurpose,
          stay_duration: data.stayDuration,
          travel_issues: data.travelIssues,
          how_found: data.howDidYouFind,
          how_found_other: data.howDidYouFindOther,

          // システム項目
          notes: `Form submitted for ${experienceTitle}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage =
          result.message || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }

      // GA4イベント: フォーム送信成功（非同期で送信）
      setTimeout(() => {
        sendGA4Event("form_submit_success", {
          experience_slug: experienceSlug,
          experience_title: experienceTitle,
          form_type: mode,
          page_location: window.location.pathname,
          user_country: data.nationality,
          user_age_group: data.ageGroup,
          visit_purposes: data.visitPurpose,
          stay_duration: data.stayDuration,
          how_did_you_find: data.howDidYouFind,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        });
      }, 0);

      setIsSuccess(true);
      announceToScreenReader(
        mode === "shibuyapass"
          ? "Registration completed successfully!"
          : "Coupon sent successfully!",
      );

      // onSuccessを少し遅延して呼び出し（UIの更新を待つ）
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 100);
    } catch (err) {
      console.error("Form submission error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send coupon. Please try again.";
      setError(errorMessage);
      announceToScreenReader(`Error: ${errorMessage}`);

      // GA4イベント: フォーム送信エラー（非同期で送信）
      setTimeout(() => {
        sendGA4Event("form_submit_error", {
          experience_slug: experienceSlug,
          experience_title: experienceTitle,
          form_type: mode,
          page_location: window.location.pathname,
          error_message: err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        });
      }, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-600">
          Step {currentStep} of 3
        </span>
        <span className="text-sm text-gray-500">
          {currentStep === 1 && "Basic Information"}
          {currentStep === 2 && "Additional Details (Optional)"}
          {currentStep === 3 && "Confirmation"}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 3) * 100}%` }}
        />
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-primary-500"
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
          Thank you for your interest!
        </h3>
        <p className="text-gray-600 mb-4">
          Thank you for registering with Gappy! We've received your information
          and will contact you soon with more details about this experience.
        </p>
        {/* Article suggestion */}
        <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-primary-700 font-semibold mb-2">
            Want to know more about Shibuya?
          </p>
          <a
            href="/articles"
            className="inline-block px-5 py-2 rounded-full bg-primary-500 text-white font-semibold shadow hover:bg-primary-600 transition"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read Articles
          </a>
        </div>
        <button
          onClick={() => {
            setIsSuccess(false);
            setCurrentStep(1);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mt-6"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      id="coupon-form"
      className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Register for this Experience
      </h2>
      <p className="text-center text-gray-600 mb-4">
        Sign up to receive more information about this experience!
      </p>
      <ProgressBar />
      <form onSubmit={handleSubmit(onSubmit)} data-form-name="coupon_form">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register("firstName")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your first name"
                  aria-describedby="firstName-error"
                />
                {errors.firstName && (
                  <p
                    id="firstName-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register("lastName")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your last name"
                  aria-describedby="lastName-error"
                />
                {errors.lastName && (
                  <p
                    id="lastName-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
                aria-describedby="email-error"
              />
              {errors.email && (
                <p
                  id="email-error"
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number *
              </label>
              <PhoneInput
                id="phoneNumber"
                international
                defaultCountry="US"
                value={watchedFields.phoneNumber}
                onChange={(value) => {
                  setValue("phoneNumber", value || "");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your phone number"
                aria-describedby="phoneNumber-error"
                countrySelectProps={{
                  unicodeFlags: true,
                }}
              />
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

            <div className="flex items-start">
              <input
                id="agreeToTerms"
                type="checkbox"
                {...register("agreeToTerms")}
                className="mt-1 mr-2"
                aria-describedby="agreeToTerms-error"
              />
              <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                I agree to the{" "}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a
                  href="/terms-of-use"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Terms of Use
                </a>{" "}
                *
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Optional Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                These questions are optional. You can skip this step.
              </span>
              <button
                type="button"
                onClick={goToConfirmation}
                className="bg-gray-300 text-gray-700 px-4 py-1 rounded-md hover:bg-gray-400 transition-colors font-semibold"
              >
                Skip
              </button>
            </div>

            {/* Minimal questions */}
            <AutocompleteInput
              value={watchedFields.nationality || ""}
              onChange={(value) => setValue("nationality", value)}
              options={COUNTRIES}
              placeholder="Start typing your country/region..."
              id="nationality"
              label="Country/Region of Residence"
              isOptional={true}
              register={register}
              name="nationality"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Group <span className="text-gray-500">(Optional)</span>
              </label>
              <select
                {...register("ageGroup")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select your age group</option>
                {AGE_GROUPS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>

            {/* 詳細項目の折りたたみ */}
            <div>
              <button
                type="button"
                onClick={() => setShowMoreQuestions((prev) => !prev)}
                className="text-blue-600 hover:underline text-sm font-medium mt-2"
              >
                {showMoreQuestions
                  ? "Hide additional questions"
                  : "Show more questions"}
              </button>
            </div>

            {showMoreQuestions && (
              <div className="space-y-6 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose of Visit{" "}
                    <span className="text-gray-500">
                      (Optional - Multiple selection allowed)
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {VISIT_PURPOSES.map((purpose) => (
                      <label key={purpose} className="flex items-center">
                        <input
                          type="checkbox"
                          value={purpose}
                          {...register("visitPurpose")}
                          className="mr-2"
                        />
                        <span className="text-sm">{purpose}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration of Stay{" "}
                    <span className="text-gray-500">(Optional)</span>
                  </label>
                  <select
                    {...register("stayDuration")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select duration</option>
                    {STAY_DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenges During Your Trip{" "}
                    <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    {...register("travelIssues")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us about any challenges you've faced during your trip to Japan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How did you find our website?{" "}
                    <span className="text-gray-500">(Optional)</span>
                  </label>
                  <select
                    {...register("howDidYouFind")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an option</option>
                    {HOW_FOUND_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {watchedFields.howDidYouFind === "Other" && (
                    <input
                      type="text"
                      {...register("howDidYouFindOther")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                      placeholder="Please specify..."
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={goToConfirmation}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {mode === "shibuyapass"
                ? "Confirm your registration details"
                : "Please confirm your information"}
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Basic Information
              </h4>
              <p>
                <strong>Name:</strong> {watchedFields.firstName}{" "}
                {watchedFields.lastName}
              </p>
              <p>
                <strong>Email:</strong> {watchedFields.email}
              </p>
              <p>
                <strong>Phone Number:</strong> {watchedFields.phoneNumber}
              </p>
            </div>

            {(watchedFields.nationality ||
              watchedFields.ageGroup ||
              watchedFields.visitPurpose?.length) && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Additional Details
                </h4>
                {watchedFields.nationality && (
                  <p>
                    <strong>Country/Region:</strong> {watchedFields.nationality}
                  </p>
                )}
                {watchedFields.ageGroup && (
                  <p>
                    <strong>Age Group:</strong> {watchedFields.ageGroup}
                  </p>
                )}
                {watchedFields.visitPurpose?.length && (
                  <p>
                    <strong>Visit Purpose:</strong>{" "}
                    {watchedFields.visitPurpose.join(", ")}
                  </p>
                )}
                {watchedFields.stayDuration && (
                  <p>
                    <strong>Stay Duration:</strong> {watchedFields.stayDuration}
                  </p>
                )}
                {watchedFields.howDidYouFind && (
                  <p>
                    <strong>How you found us:</strong>{" "}
                    {watchedFields.howDidYouFind}
                    {watchedFields.howDidYouFindOther &&
                      ` (${watchedFields.howDidYouFindOther})`}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer">
                    Show technical details
                  </summary>
                  <pre className="text-xs text-red-400 mt-1 whitespace-pre-wrap">
                    {error}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Previous
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={() => {}}
                className="bg-primary-600 text-white px-8 py-2 rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? mode === "shibuyapass"
                    ? "Registering..."
                    : "Sending..."
                  : mode === "shibuyapass"
                    ? "Register and go to Shibuya Pass"
                    : "Send Coupon"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ExperienceForm;
