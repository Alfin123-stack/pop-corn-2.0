"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { localizeHref } from "@/lib/i18n/path";
import { useI18n } from "./i18n-provider";

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** `next/link` that keeps the visitor in their language: `/movies` becomes `/id/movies` on the Indonesian site. */
export default function LocaleLink({ href, ...rest }: LocaleLinkProps) {
  const { locale } = useI18n();
  return <Link href={localizeHref(locale, href)} {...rest} />;
}
