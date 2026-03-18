import type { ParkingType } from "@/types";

export type ParkingFeeConfig = {
  normalPerHour: number;
  evPerHour: number;
  disabledPerHour: number;
  currency: string;
};

export function getParkingRatePerHour(type: ParkingType, config: ParkingFeeConfig) {
  if (type === "ev") return config.evPerHour;
  if (type === "disabled") return config.disabledPerHour;
  return config.normalPerHour;
}

export function calculateParkingFee(input: {
  type: ParkingType;
  startTime: Date | string;
  endTime: Date | string;
  config: ParkingFeeConfig;
}) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const durationMs = Math.max(endTime.getTime() - startTime.getTime(), 0);
  const durationHours = durationMs / (1000 * 60 * 60);
  const ratePerHour = getParkingRatePerHour(input.type, input.config);
  const total = Math.round(durationHours * ratePerHour * 100) / 100;

  return {
    ratePerHour,
    durationHours,
    total,
    currency: input.config.currency,
  };
}

export function formatParkingFee(amount: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
