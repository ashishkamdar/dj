"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/actions/auth";

const MAX_PIN_LENGTH = 6;
const MIN_PIN_LENGTH = 4;

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDigit(digit: string) {
    if (pin.length >= MAX_PIN_LENGTH) return;
    setError("");
    setPin((prev) => prev + digit);
  }

  function handleBackspace() {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  }

  function handleSubmit() {
    if (pin.length < MIN_PIN_LENGTH) {
      setError("PIN must be at least 4 digits");
      return;
    }

    startTransition(async () => {
      const result = await loginAction(pin);
      if (result?.error) {
        setError(result.error);
        setPin("");
      }
    });
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          DJ Foods
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your PIN to continue
        </p>
      </div>

      {/* PIN Dots */}
      <div className="mb-8 flex items-center gap-3">
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full transition-all duration-150 ${
              i < pin.length
                ? "scale-110 bg-indigo-600 dark:bg-indigo-500"
                : "bg-gray-200 dark:bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      <div className="mb-4 h-5">
        {error && (
          <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {/* Number Pad */}
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {/* Row 1 */}
        {["1", "2", "3"].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isPending}
            onClick={() => handleDigit(digit)}
            className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          >
            {digit}
          </button>
        ))}

        {/* Row 2 */}
        {["4", "5", "6"].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isPending}
            onClick={() => handleDigit(digit)}
            className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          >
            {digit}
          </button>
        ))}

        {/* Row 3 */}
        {["7", "8", "9"].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={isPending}
            onClick={() => handleDigit(digit)}
            className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
          >
            {digit}
          </button>
        ))}

        {/* Row 4: Backspace, 0, Submit */}
        <button
          type="button"
          disabled={isPending || pin.length === 0}
          onClick={handleBackspace}
          className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        >
          &#8592;
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleDigit("0")}
          className="flex h-16 items-center justify-center rounded-xl bg-gray-50 text-2xl font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:hover:bg-white/10 dark:active:bg-white/15"
        >
          0
        </button>

        <button
          type="button"
          disabled={isPending || pin.length < MIN_PIN_LENGTH}
          onClick={handleSubmit}
          className="flex h-16 items-center justify-center rounded-xl bg-indigo-600 text-lg font-semibold text-white shadow-xs hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {isPending ? (
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <span>&#8594;</span>
          )}
        </button>
      </div>
    </div>
  );
}
