import { notFound } from "next/navigation";

/** Any URL that matches no page lands here, so the 404 renders inside the language layout. */
export default function CatchAll() {
  notFound();
}
