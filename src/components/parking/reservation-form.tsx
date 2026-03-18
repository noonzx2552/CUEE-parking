"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarDays, Clock3, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateParkingFee, formatParkingFee, type ParkingFeeConfig } from "@/lib/parking-fees";
import { cn } from "@/lib/utils";
import { getCsrfToken } from "@/lib/web/csrf";
import { reservationCreateSchema } from "@/lib/validators/reservation";
import type { ParkingType } from "@/types";

type SpaceOption = {
  _id: string;
  code: string;
  zone: string;
  type: ParkingType;
  status: "available" | "reserved" | "occupied" | "maintenance";
};

const reservationFormSchema = z.object({
  parkingSpaceId: z.string().min(1, "กรุณาเลือกช่องจอด"),
  bookingDate: z.string().min(1, "กรุณาเลือกวันที่"),
  startClock: z.string().min(1, "กรุณาเลือกเวลาเริ่ม"),
  endClock: z.string().min(1, "กรุณาเลือกเวลาสิ้นสุด"),
  note: z.string().max(280).optional(),
});

type FormValues = z.infer<typeof reservationFormSchema>;

const timeSlots = Array.from({ length: 28 }, (_, index) => {
  const hour = String(6 + Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function displayTime(value: string) {
  const [hourRaw, minute] = value.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(normalizedHour).padStart(2, "0")}:${minute} ${suffix}`;
}

function getDateOptions() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(new Date(), index);
    return {
      value: format(date, "yyyy-MM-dd"),
      shortLabel: index === 0 ? "วันนี้" : index === 1 ? "พรุ่งนี้" : format(date, "EEE", { locale: th }),
      fullLabel: format(date, "d MMM", { locale: th }),
      longLabel: format(date, "d MMMM yyyy", { locale: th }),
    };
  });
}

export function ReservationForm({
  parkingSpaceId,
  spaces,
  disabled,
  feeConfig,
}: {
  parkingSpaceId?: string;
  spaces: SpaceOption[];
  disabled: boolean;
  feeConfig: ParkingFeeConfig;
}) {
  const router = useRouter();
  const [spotSearch, setSpotSearch] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      parkingSpaceId: parkingSpaceId ?? "",
      bookingDate: format(new Date(), "yyyy-MM-dd"),
      startClock: "08:00",
      endClock: "09:00",
      note: "",
    },
  });

  const bookingDate = useWatch({ control: form.control, name: "bookingDate" }) ?? format(new Date(), "yyyy-MM-dd");
  const startClock = useWatch({ control: form.control, name: "startClock" }) ?? "08:00";
  const endClock = useWatch({ control: form.control, name: "endClock" }) ?? "09:00";
  const selectedSpaceId = useWatch({ control: form.control, name: "parkingSpaceId" }) ?? parkingSpaceId ?? "";
  const deferredSpotSearch = useDeferredValue(spotSearch);
  const dateOptions = useMemo(() => getDateOptions(), []);
  const visibleSpaces = useMemo(() => {
    if (!deferredSpotSearch.trim()) {
      return spaces;
    }

    const needle = deferredSpotSearch.trim().toLowerCase();
    return spaces.filter((space) => space.code.toLowerCase().includes(needle));
  }, [deferredSpotSearch, spaces]);

  const selectedDateLabel =
    dateOptions.find((item) => item.value === bookingDate)?.longLabel ??
    format(parseISO(bookingDate), "d MMMM yyyy", { locale: th });

  const selectedSpace = spaces.find((space) => space._id === selectedSpaceId);
  const endTimeOptions = timeSlots.filter((slot) => slot > startClock);
  const feePreview = selectedSpace
    ? calculateParkingFee({
        type: selectedSpace.type,
        startTime: new Date(`${bookingDate}T${startClock}`),
        endTime: new Date(`${bookingDate}T${endClock}`),
        config: feeConfig,
      })
    : null;

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        const startTime = new Date(`${values.bookingDate}T${values.startClock}`);
        const endTime = new Date(`${values.bookingDate}T${values.endClock}`);
        const parsedPayload = reservationCreateSchema.safeParse({
          parkingSpaceId: values.parkingSpaceId,
          startTime,
          endTime,
          note: values.note ?? "",
        });

        if (!parsedPayload.success) {
          toast.error(parsedPayload.error.issues[0]?.message ?? "ข้อมูลการจองไม่ถูกต้อง");
          return;
        }

        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify(parsedPayload.data),
        });

        const data = await response.json();
        if (!response.ok) {
          toast.error(data.issues?.[0] ?? data.message ?? "Unable to create reservation");
          return;
        }

        toast.success("Reservation created");
        startTransition(() => {
          router.push("/reservations");
          router.refresh();
        });
      })}
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">ค้นหาช่องจอด</label>
          <Input
            value={spotSearch}
            onChange={(event) => setSpotSearch(event.target.value.toUpperCase())}
            placeholder="พิมพ์รหัส เช่น A01, B04"
          />
          <p className="text-xs text-zinc-500">พิมพ์รหัสช่องที่ต้องการ หรือเลือกจากรายการด้านล่าง</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">เลือกช่องจอด</label>
          <Select {...form.register("parkingSpaceId")} disabled={disabled}>
            <option value="">เลือกช่องจอด</option>
            {visibleSpaces.map((space) => (
              <option key={space._id} value={space._id}>
                {space.code} | Zone {space.zone} | {space.status}
              </option>
            ))}
          </Select>
          <p className="text-xs text-rose-600">{String(form.formState.errors.parkingSpaceId?.message ?? "")}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">เลือกวันและเวลา</h2>
            <p className="mt-1 text-sm leading-7 text-zinc-500">
              เลือกวันก่อน แล้วกำหนดเวลาเริ่มและเวลาสิ้นสุดให้เรียบร้อย
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-zinc-700">วันที่ต้องการจอด</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dateOptions.map((item) => {
              const active = bookingDate === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => form.setValue("bookingDate", item.value, { shouldValidate: true })}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    active
                      ? "border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-100"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-sky-200 hover:bg-sky-50",
                  )}
                >
                  <p className={cn("text-sm font-semibold", active ? "text-white" : "text-zinc-900")}>{item.shortLabel}</p>
                  <p className={cn("mt-1 text-sm", active ? "text-sky-100" : "text-zinc-500")}>{item.fullLabel}</p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-rose-600">{String(form.formState.errors.bookingDate?.message ?? "")}</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-700" />
              <p className="text-sm font-medium text-zinc-800">เวลาเริ่ม</p>
            </div>
            <Select
              value={startClock}
              onChange={(event) => {
                const nextStart = event.target.value;
                form.setValue("startClock", nextStart, { shouldValidate: true });
                if (endClock <= nextStart) {
                  const nextEnd = timeSlots.find((slot) => slot > nextStart) ?? nextStart;
                  form.setValue("endClock", nextEnd, { shouldValidate: true });
                }
              }}
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {displayTime(slot)}
                </option>
              ))}
            </Select>
            <p className="mt-3 text-2xl font-semibold text-zinc-950">{displayTime(startClock)}</p>
            <p className="mt-1 text-sm text-zinc-500">เวลาเริ่มต้นที่คุณต้องการเข้าจอด</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-700" />
              <p className="text-sm font-medium text-zinc-800">เวลาสิ้นสุด</p>
            </div>
            <Select
              value={endClock}
              onChange={(event) => form.setValue("endClock", event.target.value, { shouldValidate: true })}
            >
              {endTimeOptions.map((slot) => (
                <option key={slot} value={slot}>
                  {displayTime(slot)}
                </option>
              ))}
            </Select>
            <p className="mt-3 text-2xl font-semibold text-zinc-950">{displayTime(endClock)}</p>
            <p className="mt-1 text-sm text-zinc-500">ต้องมากกว่าเวลาเริ่มเสมอ</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">วันจอด</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">{selectedDateLabel}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">เริ่มจอด</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">{displayTime(startClock)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">สิ้นสุด</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">{displayTime(endClock)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">ค่าจอด</p>
            <p className="mt-2 text-lg font-semibold text-zinc-950">
              {feePreview ? formatParkingFee(feePreview.total, feePreview.currency) : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {feePreview ? `${feePreview.ratePerHour} / ชั่วโมง` : "เลือกช่องก่อนเพื่อคำนวณ"}
            </p>
          </div>
        </div>

        {feePreview ? (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
            ค่าจอดคำนวณจากประเภท {selectedSpace?.type ?? "-"} ระยะเวลา {feePreview.durationHours.toFixed(2)} ชั่วโมง
            รวม {formatParkingFee(feePreview.total, feePreview.currency)}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
          เช็กอินได้ก่อนเวลาเริ่ม 30 นาที และถ้ายังไม่เช็กอิน ระบบจะถือสิทธิ์จองต่อให้อีก 10 นาที
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">รายละเอียดเพิ่มเติม</label>
        <Textarea {...form.register("note")} placeholder="ทะเบียนรถ หรือรายละเอียดที่อยากแจ้ง" />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-start gap-3">
          <MapPinned className="mt-0.5 h-5 w-5 text-sky-700" />
          <div>
            <p className="font-medium text-zinc-900">ตรวจสอบอีกครั้งก่อนยืนยัน</p>
            <p className="mt-1 text-sm text-zinc-500">
              ระบบจะจองตามช่อง วันที่ เวลา และค่าจอดที่แสดงด้านบน
            </p>
          </div>
        </div>
      </div>

      <Button disabled={disabled || form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? "กำลังบันทึก..." : "ยืนยันการจอง"}
      </Button>
    </form>
  );
}
