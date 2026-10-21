import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, ViewTabs, DemoNotice, Logo } from "@/components/brand";
import { BookingPanel } from "@/components/booking-panel";
import { RestaurantInfo } from "@/components/restaurant-info";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reserve a table — Khaosan Dhaka" },
      { name: "description", content: "Choose your date, find an available time, and reserve a table at Khaosan." },
      { property: "og:title", content: "Reserve a table — Khaosan Dhaka" },
      { property: "og:description", content: "Choose your date, find an available time, and reserve at Khaosan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="thai-pattern h-2" aria-hidden />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-6 lg:grid-cols-[1fr_360px] lg:gap-10 lg:pt-10">
        <div className="space-y-5">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl">Your table. Your time.</h1>
            <p className="mt-2 text-base text-muted-foreground">Choose your date, find an available time, and reserve at Khaosan.</p>
          </div>
          <ViewTabs active="reserve" />
          <section className="surface p-4 sm:p-6" aria-label="Reservation">
            <BookingPanel />
          </section>
        </div>
        <aside className="space-y-4">
          <div className="surface hidden overflow-hidden lg:block">
            <Logo className="h-auto w-full rounded-none" />
          </div>
          <RestaurantInfo />
          <DemoNotice />
        </aside>
      </main>
    </div>
  );
}
