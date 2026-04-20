"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "@/actions/locale";
import { LanguageIcon } from "@heroicons/react/24/outline";

export function LanguageSwitcher() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLanguage(newLocale: string) {
    startTransition(async () => {
      await setLocaleAction(newLocale);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/50 dark:ring-white/10">
      <div className="flex items-start gap-4">
        <LanguageIcon className="size-8 text-gray-400 dark:text-gray-500 shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("language")}
          </h3>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => switchLanguage("en")}
              disabled={isPending}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                locale === "en"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {t("english")}
            </button>
            <button
              onClick={() => switchLanguage("hi")}
              disabled={isPending}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                locale === "hi"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {t("hindi")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
