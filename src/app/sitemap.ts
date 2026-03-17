import type { MetadataRoute } from "next";
import { fetchMergedStations } from "@/lib/fuel-api";
import { groupBySuburb, suburbToSlug } from "@/lib/suburbs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stations = await fetchMergedStations();
  const vicStations = stations.filter((s) => (s.state ?? "VIC") === "VIC");
  const nswStations = stations.filter((s) => s.state === "NSW");

  const vicSuburbPages: MetadataRoute.Sitemap = [...groupBySuburb(vicStations).keys()].map(
    (suburb) => ({
      url: `https://petrolsaver.live/prices/${suburbToSlug(suburb)}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })
  );

  const nswSuburbPages: MetadataRoute.Sitemap = [...groupBySuburb(nswStations).keys()].map(
    (suburb) => ({
      url: `https://petrolsaver.live/prices/nsw/${suburbToSlug(suburb)}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })
  );

  return [
    {
      url: "https://petrolsaver.live",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: "https://petrolsaver.live/how-it-works",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...vicSuburbPages,
    ...nswSuburbPages,
    ...stations.map((s) => ({
      url: `https://petrolsaver.live/station/${encodeURIComponent(s.id)}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.6,
    })),
  ];
}
