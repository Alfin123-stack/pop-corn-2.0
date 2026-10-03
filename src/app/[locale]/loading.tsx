import { Container } from "@/components/container";
import { LoadingLabel } from "@/components/loading-label";

export default function Loading() {
  return (
    <Container className="pt-12" aria-busy>
      <div className="shimmer mx-auto h-[13.75rem] max-w-[55rem] rounded-card" />
      <div className="shimmer mx-auto mt-8 h-14 max-w-[40rem] rounded-full" />
      <div className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="shimmer aspect-[4/5] rounded-card" />
        ))}
      </div>
      <LoadingLabel />
    </Container>
  );
}
