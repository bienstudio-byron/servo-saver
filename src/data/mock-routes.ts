import { MockRoute, TollSegment } from "@/types/toll";
import citylink from "./tolls/melbourne/citylink.json";
import eastlink from "./tolls/melbourne/eastlink.json";

// Route 1: Tullamarine → CBD via CityLink vs Pascoe Vale Rd
const tullamarine_cbd: MockRoute = {
  id: "tulla-cbd",
  name: "Tullamarine → CBD",
  origin: { lat: -37.6733, lng: 144.8435 },
  destination: { lat: -37.8136, lng: 144.9631 },
  tollRoute: {
    distance: 23, duration: 20, isTollRoute: true,
    polyline: [
      { lat: -37.6733, lng: 144.8435 }, { lat: -37.6821, lng: 144.8652 },
      { lat: -37.6892, lng: 144.9019 }, { lat: -37.7050, lng: 144.9100 },
      { lat: -37.7298, lng: 144.9182 }, { lat: -37.7510, lng: 144.9280 },
      { lat: -37.7712, lng: 144.9363 }, { lat: -37.7889, lng: 144.9423 },
      { lat: -37.7950, lng: 144.9450 }, { lat: -37.8052, lng: 144.9382 },
      { lat: -37.8100, lng: 144.9500 }, { lat: -37.8136, lng: 144.9631 },
    ],
  },
  freeRoute: {
    distance: 27, duration: 38, isTollRoute: false,
    polyline: [
      { lat: -37.6733, lng: 144.8435 }, { lat: -37.6850, lng: 144.8580 },
      { lat: -37.6980, lng: 144.8750 }, { lat: -37.7100, lng: 144.8920 },
      { lat: -37.7250, lng: 144.9050 }, { lat: -37.7380, lng: 144.9150 },
      { lat: -37.7500, lng: 144.9220 }, { lat: -37.7620, lng: 144.9280 },
      { lat: -37.7750, lng: 144.9350 }, { lat: -37.7880, lng: 144.9420 },
      { lat: -37.7960, lng: 144.9480 }, { lat: -37.8050, lng: 144.9550 },
      { lat: -37.8136, lng: 144.9631 },
    ],
  },
  tollSegmentIds: ["cl-tulla"],
};

// Route 2: Ringwood → Frankston via EastLink vs Springvale Rd
const ringwood_frankston: MockRoute = {
  id: "ringwood-frankston",
  name: "Ringwood → Frankston",
  origin: { lat: -37.8152, lng: 145.2293 },
  destination: { lat: -38.1499, lng: 145.1260 },
  tollRoute: {
    distance: 42, duration: 30, isTollRoute: true,
    polyline: [
      { lat: -37.8152, lng: 145.2293 }, { lat: -37.8300, lng: 145.2310 },
      { lat: -37.8598, lng: 145.2201 }, { lat: -37.8855, lng: 145.2155 },
      { lat: -37.9083, lng: 145.2095 }, { lat: -37.9325, lng: 145.2082 },
      { lat: -37.9588, lng: 145.2055 }, { lat: -37.9842, lng: 145.1782 },
      { lat: -38.0188, lng: 145.1621 }, { lat: -38.0528, lng: 145.1502 },
      { lat: -38.0850, lng: 145.1400 }, { lat: -38.1200, lng: 145.1320 },
      { lat: -38.1499, lng: 145.1260 },
    ],
  },
  freeRoute: {
    distance: 51, duration: 55, isTollRoute: false,
    polyline: [
      { lat: -37.8152, lng: 145.2293 }, { lat: -37.8300, lng: 145.2100 },
      { lat: -37.8500, lng: 145.1800 }, { lat: -37.8700, lng: 145.1600 },
      { lat: -37.8900, lng: 145.1500 }, { lat: -37.9100, lng: 145.1400 },
      { lat: -37.9350, lng: 145.1350 }, { lat: -37.9600, lng: 145.1300 },
      { lat: -37.9850, lng: 145.1250 }, { lat: -38.0100, lng: 145.1200 },
      { lat: -38.0400, lng: 145.1150 }, { lat: -38.0700, lng: 145.1200 },
      { lat: -38.1000, lng: 145.1230 }, { lat: -38.1300, lng: 145.1250 },
      { lat: -38.1499, lng: 145.1260 },
    ],
  },
  tollSegmentIds: ["el-ringwood-scoresby", "el-scoresby-dandenong", "el-dandenong-frankston"],
};

// Route 3: Tullamarine → Dandenong via CityLink + EastLink
const tulla_dandenong: MockRoute = {
  id: "tulla-dandenong",
  name: "Tullamarine → Dandenong",
  origin: { lat: -37.6733, lng: 144.8435 },
  destination: { lat: -37.9876, lng: 145.2153 },
  tollRoute: {
    distance: 52, duration: 38, isTollRoute: true,
    polyline: [
      { lat: -37.6733, lng: 144.8435 }, { lat: -37.6892, lng: 144.9019 },
      { lat: -37.7298, lng: 144.9182 }, { lat: -37.7712, lng: 144.9363 },
      { lat: -37.7889, lng: 144.9423 }, { lat: -37.8052, lng: 144.9382 },
      { lat: -37.8188, lng: 144.9672 }, { lat: -37.8276, lng: 145.0015 },
      { lat: -37.8300, lng: 145.0500 }, { lat: -37.8350, lng: 145.1000 },
      { lat: -37.8400, lng: 145.1500 }, { lat: -37.8598, lng: 145.2201 },
      { lat: -37.8855, lng: 145.2155 }, { lat: -37.9083, lng: 145.2095 },
      { lat: -37.9325, lng: 145.2082 }, { lat: -37.9588, lng: 145.2055 },
      { lat: -37.9876, lng: 145.2153 },
    ],
  },
  freeRoute: {
    distance: 58, duration: 65, isTollRoute: false,
    polyline: [
      { lat: -37.6733, lng: 144.8435 }, { lat: -37.6980, lng: 144.8750 },
      { lat: -37.7250, lng: 144.9050 }, { lat: -37.7500, lng: 144.9220 },
      { lat: -37.7750, lng: 144.9350 }, { lat: -37.8000, lng: 144.9500 },
      { lat: -37.8136, lng: 144.9631 }, { lat: -37.8300, lng: 144.9900 },
      { lat: -37.8500, lng: 145.0200 }, { lat: -37.8700, lng: 145.0500 },
      { lat: -37.8900, lng: 145.0800 }, { lat: -37.9100, lng: 145.1100 },
      { lat: -37.9300, lng: 145.1400 }, { lat: -37.9500, lng: 145.1700 },
      { lat: -37.9700, lng: 145.1950 }, { lat: -37.9876, lng: 145.2153 },
    ],
  },
  tollSegmentIds: ["cl-tulla", "cl-southern-burnley", "el-ringwood-scoresby", "el-scoresby-dandenong"],
};

export const MOCK_ROUTES: MockRoute[] = [tullamarine_cbd, ringwood_frankston, tulla_dandenong];

export function getSegmentsForRoute(route: MockRoute): TollSegment[] {
  const allSegments = [
    ...(citylink.segments as TollSegment[]),
    ...(eastlink.segments as TollSegment[]),
  ];
  return allSegments.filter((s) => route.tollSegmentIds.includes(s.id));
}
