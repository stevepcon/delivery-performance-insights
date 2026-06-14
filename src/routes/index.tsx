import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Delivery Performance Insights" },
      {
        name: "description",
        content:
          "Modern logistics analytics dashboard visualising shipment and carrier performance across European delivery networks.",
      },
      { property: "og:title", content: "Delivery Performance Insights" },
      {
        property: "og:description",
        content:
          "Compare carriers, track delivery success rates, and surface logistics insights from live shipment data.",
      },
    ],
  }),
  component: Dashboard,
});
