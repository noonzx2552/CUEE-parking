"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  KeyRound,
  MapPin,
  MoveRight,
  QrCode,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCsrfToken } from "@/lib/web/csrf";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

type ViewMode = "home" | "camera";

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const parkingPins = [
  {
    zone: "A",
    title: "à¸­à¸²à¸„à¸²à¸£à¹€à¸£à¸µà¸¢à¸™à¸«à¸¥à¸±à¸",
    detail: "à¹€à¸«à¸¡à¸²à¸°à¸à¸±à¸šà¸à¸²à¸£à¸ˆà¸­à¸”à¸£à¸°à¸¢à¸°à¸ªà¸±à¹‰à¸™à¹à¸¥à¸° EV",
    accent: "bg-sky-600",
  },
];

function parseScannedValue(value: string) {
  try {
    const url = new URL(value);
    return {
      mode: (url.searchParams.get("mode") === "exit" ? "exit" : "entry") as "entry" | "exit",
      token: url.searchParams.get("token") ?? "",
      rawUrl: url.toString(),
    };
  } catch {
    return {
      mode: "entry" as const,
      token: value,
      rawUrl: "",
    };
  }
}

export function ScanAccessClient({
  initialMode,
  initialToken,
  initialView,
}: {
  initialMode?: "entry" | "exit";
  initialToken?: string;
  initialView?: ViewMode;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<"entry" | "exit">(initialMode ?? "entry");
  const [view, setView] = useState<ViewMode>(initialToken ? "camera" : initialView ?? "home");
  const [tokenInput, setTokenInput] = useState(initialToken ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const submitToken = useCallback(async (rawToken: string, currentMode: "entry" | "exit") => {
    if (!rawToken) {
      toast.error("à¹„à¸¡à¹ˆà¸žà¸š token à¸‚à¸­à¸‡ QR");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/parking/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({
        mode: currentMode,
        token: rawToken,
      }),
    });
    const data = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(data.message ?? "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸ªà¹à¸à¸™ QR à¹„à¸”à¹‰");
      return;
    }

    setResultMessage(data.message);
    toast.success(data.message);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!initialToken) {
      return;
    }

    setView("camera");
    void submitToken(initialToken, initialMode ?? "entry");
  }, [initialMode, initialToken, submitToken]);

  useEffect(() => {
    if (view !== "camera" || initialToken || !window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      if (view === "camera" && !window.BarcodeDetector) {
        setScannerError("à¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œà¸™à¸µà¹‰à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸šà¸à¸²à¸£à¸ªà¹à¸à¸™à¸ˆà¸²à¸à¸«à¸™à¹‰à¸²à¹€à¸§à¹‡à¸š à¸ªà¸²à¸¡à¸²à¸£à¸–à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œ QR à¸«à¸£à¸·à¸­à¹ƒà¸Šà¹‰à¸à¸¥à¹‰à¸­à¸‡à¸¡à¸·à¸­à¸–à¸·à¸­à¸›à¸à¸•à¸´à¹„à¸”à¹‰");
      }
      return;
    }

    let intervalId: number | null = null;
    let stream: MediaStream | null = null;
    let locked = false;

    async function startScanner() {
      try {
        setScannerError("");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScannerReady(true);

        const BarcodeDetectorApi = window.BarcodeDetector;
        if (!BarcodeDetectorApi) {
          setScannerError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸£à¸´à¹ˆà¸¡à¸•à¸±à¸§à¸ªà¹à¸à¸™ QR à¹„à¸”à¹‰");
          return;
        }

        const detector = new BarcodeDetectorApi({ formats: ["qr_code"] });
        intervalId = window.setInterval(async () => {
          if (!videoRef.current || locked || videoRef.current.readyState < 2) {
            return;
          }

          locked = true;
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes[0]?.rawValue;
            if (!rawValue) {
              return;
            }

            const parsed = parseScannedValue(rawValue);
            if (parsed.rawUrl) {
              window.location.href = parsed.rawUrl;
              return;
            }

            setMode(parsed.mode);
            setTokenInput(parsed.token);
            void submitToken(parsed.token, parsed.mode);
          } finally {
            locked = false;
          }
        }, 900);
      } catch {
        setScannerError("à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸­à¸™à¸¸à¸à¸²à¸•à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸à¸¥à¹‰à¸­à¸‡ à¸«à¸£à¸·à¸­à¹ƒà¸Šà¹‰à¸¥à¸´à¸‡à¸à¹Œà¸ˆà¸²à¸à¸à¸²à¸£à¸ªà¹à¸à¸™à¸”à¹‰à¸§à¸¢à¸à¸¥à¹‰à¸­à¸‡à¸¡à¸·à¸­à¸–à¸·à¸­");
      }
    }

    void startScanner();

    return () => {
      setScannerReady(false);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [initialToken, submitToken, view]);

  function openCameraView(nextMode: "entry" | "exit") {
    setMode(nextMode);
    setView("camera");
    router.push(`/scan?view=camera&mode=${nextMode}`);
  }

  function openHomeView() {
    setView("home");
    setScannerReady(false);
    setScannerError("");
    router.push(`/scan?mode=${mode}`);
  }

  if (view === "camera") {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a,#1e3a8a)] p-0 text-white shadow-xl">
          <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
            <div className="space-y-4">
              <button
                type="button"
                onClick={openHomeView}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-100/90"
              >
                <ArrowLeft className="h-4 w-4" />
                à¸à¸¥à¸±à¸šà¹„à¸›à¸«à¸™à¹‰à¸²à¹€à¸¥à¸·à¸­à¸à¸§à¸´à¸˜à¸µà¹€à¸‚à¹‰à¸²à¸­à¸­à¸
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-sky-100/70">Live Camera</p>
                <h1 className="mt-3 text-3xl font-semibold">à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹à¸à¸™ QR {mode === "entry" ? "à¹€à¸‚à¹‰à¸²" : "à¸­à¸­à¸"}</h1>
              </div>
              <p className="max-w-xl text-sm leading-7 text-sky-50/80">
                à¸«à¸±à¸™à¸à¸¥à¹‰à¸­à¸‡à¹„à¸›à¸—à¸µà¹ˆ QR à¹à¸¥à¹‰à¸§à¸£à¸°à¸šà¸šà¸ˆà¸°à¸žà¸²à¹€à¸‚à¹‰à¸² flow à¹ƒà¸«à¹‰à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ à¸–à¹‰à¸²à¸¡à¸²à¸ˆà¸²à¸à¸à¸¥à¹‰à¸­à¸‡à¸¡à¸·à¸­à¸–à¸·à¸­à¸›à¸à¸•à¸´à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§ à¸«à¸™à¹‰à¸²à¹€à¸§à¹‡à¸šà¸™à¸µà¹‰à¸ˆà¸°à¸£à¸±à¸šà¸‡à¸²à¸™à¸•à¹ˆà¸­à¹ƒà¸«à¹‰à¹€à¸¥à¸¢
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={mode === "entry" ? "primary" : "ghost"}
                  className={mode === "entry" ? "" : "border-white/20 bg-white/10 text-white hover:bg-white/15"}
                  onClick={() => openCameraView("entry")}
                >
                  à¹‚à¸«à¸¡à¸”à¹€à¸‚à¹‰à¸²
                </Button>
                <Button
                  type="button"
                  variant={mode === "exit" ? "primary" : "ghost"}
                  className={mode === "exit" ? "" : "border-white/20 bg-white/10 text-white hover:bg-white/15"}
                  onClick={() => openCameraView("exit")}
                >
                  à¹‚à¸«à¸¡à¸”à¸­à¸­à¸
                </Button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
                <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-white">
                  {scannerReady ? "à¸à¸¥à¹‰à¸­à¸‡à¸žà¸£à¹‰à¸­à¸¡à¹à¸¥à¹‰à¸§ à¸ªà¹à¸à¸™à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ" : "à¸à¸³à¸¥à¸±à¸‡à¹€à¸•à¸£à¸µà¸¢à¸¡à¸à¸¥à¹‰à¸­à¸‡à¸«à¸£à¸·à¸­à¸£à¸­à¸ªà¸´à¸—à¸˜à¸´à¹Œà¸ˆà¸²à¸à¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œ"}
                </p>
                <p className="text-sm text-sky-100/70">
                  à¸–à¹‰à¸²à¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œà¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸š à¹ƒà¸«à¹‰à¸à¸¥à¸±à¸šà¹„à¸›à¹ƒà¸Šà¹‰à¸¥à¸´à¸‡à¸à¹Œà¸«à¸£à¸·à¸­ token à¸”à¹‰à¸²à¸™à¸¥à¹ˆà¸²à¸‡à¹à¸—à¸™
                </p>
                {scannerError ? <p className="text-sm text-amber-300">{scannerError}</p> : null}
                {resultMessage ? (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                    {resultMessage}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-sky-700" />
              <h2 className="text-lg font-semibold text-zinc-950">à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œà¸«à¸£à¸·à¸­ token à¹€à¸­à¸‡</h2>
            </div>
            <Input
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="à¸§à¸²à¸‡ URL à¸ˆà¸²à¸ QR à¸«à¸£à¸·à¸­ token"
            />
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  const parsed = parseScannedValue(tokenInput);
                  setMode(parsed.mode);
                  void submitToken(parsed.token, parsed.mode);
                }}
                type="button"
              >
                {isSubmitting ? "à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£..." : mode === "entry" ? "à¹€à¸Šà¹‡à¸à¸­à¸´à¸™" : "à¹€à¸Šà¹‡à¸à¹€à¸­à¸²à¸•à¹Œ"}
              </Button>
              <Link href="/reservations" className="inline-flex h-11 items-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700">
                à¸à¸¥à¸±à¸šà¹„à¸›à¸«à¸™à¹‰à¸²à¸à¸²à¸£à¸ˆà¸­à¸‡
              </Link>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-sky-700" />
              <h2 className="text-lg font-semibold text-zinc-950">PIN à¸šà¸£à¸´à¹€à¸§à¸“à¸—à¸µà¹ˆà¸ˆà¸­à¸”</h2>
            </div>
            <div className="grid gap-3">
              {parkingPins.map((pin) => (
                <div key={pin.zone} className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white ${pin.accent}`}>
                    {pin.zone}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">{pin.title}</p>
                    <p className="text-sm text-zinc-500">{pin.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#fff7ed,#ffffff_45%,#eff6ff)] p-0 shadow-xl">
        <div className="grid gap-10 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-9">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
              Access Gate
            </div>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
                à¹€à¸¥à¸·à¸­à¸à¸§à¸´à¸˜à¸µà¸ªà¹à¸à¸™à¹€à¸‚à¹‰à¸²à¸­à¸­à¸à¸ˆà¸²à¸à¸¥à¸²à¸™à¸ˆà¸­à¸”à¸à¹ˆà¸­à¸™
              </h1>
              <p className="max-w-xl text-base leading-8 text-zinc-600">
                à¸à¸”à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¹€à¸žà¸·à¹ˆà¸­à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸«à¸™à¹‰à¸² scanner à¹‚à¸”à¸¢à¸•à¸£à¸‡ à¸«à¸£à¸·à¸­à¹ƒà¸Šà¹‰à¸¥à¸´à¸‡à¸à¹Œ/QR à¸ˆà¸²à¸à¸¡à¸·à¸­à¸–à¸·à¸­ à¹à¸¥à¹‰à¸§à¸”à¸¹à¸•à¸³à¹à¸«à¸™à¹ˆà¸‡à¹‚à¸‹à¸™à¸ˆà¸­à¸”à¸£à¸–à¸ˆà¸²à¸ PIN à¸”à¹‰à¸²à¸™à¸¥à¹ˆà¸²à¸‡à¹„à¸”à¹‰à¸—à¸±à¸™à¸—à¸µ
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => openCameraView("entry")}
                className="group rounded-[28px] border border-sky-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white">
                    <Camera className="h-5 w-5" />
                  </div>
                  <MoveRight className="h-5 w-5 text-zinc-400 transition group-hover:text-sky-700" />
                </div>
                <p className="mt-6 text-xl font-semibold text-zinc-950">à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¸ªà¹à¸à¸™à¹€à¸‚à¹‰à¸²</p>
                <p className="mt-2 text-sm leading-7 text-zinc-600">
                  à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸«à¸™à¹‰à¸²à¸à¸¥à¹‰à¸­à¸‡à¹à¸šà¸šà¹€à¸•à¹‡à¸¡à¸«à¸™à¹‰à¸²à¸ˆà¸­à¹€à¸žà¸·à¹ˆà¸­à¹€à¸Šà¹‡à¸à¸­à¸´à¸™à¸ˆà¸²à¸ QR
                </p>
              </button>

              <button
                type="button"
                onClick={() => openCameraView("exit")}
                className="group rounded-[28px] border border-zinc-200 bg-zinc-950 p-5 text-left text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  <MoveRight className="h-5 w-5 text-zinc-500 transition group-hover:text-white" />
                </div>
                <p className="mt-6 text-xl font-semibold">à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¸ªà¹à¸à¸™à¸­à¸­à¸</p>
                <p className="mt-2 text-sm leading-7 text-zinc-300">
                  à¹ƒà¸Šà¹‰à¸•à¸­à¸™à¸£à¸–à¸­à¸­à¸à¸ˆà¸²à¸à¸Šà¹ˆà¸­à¸‡à¸ˆà¸­à¸”à¹à¸¥à¸°à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸Šà¹‡à¸à¹€à¸­à¸²à¸•à¹Œà¸—à¸±à¸™à¸—à¸µ
                </p>
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-sky-700" />
              <h2 className="text-lg font-semibold text-zinc-950">à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œà¸«à¸£à¸·à¸­ token</h2>
            </div>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
              à¹ƒà¸Šà¹‰à¹„à¸”à¹‰à¸—à¸±à¹‰à¸‡à¸¥à¸´à¸‡à¸à¹Œà¸ˆà¸²à¸ QR, token à¸—à¸µà¹ˆà¸£à¸°à¸šà¸šà¸ªà¸£à¹‰à¸²à¸‡, à¸«à¸£à¸·à¸­à¸à¸£à¸“à¸µà¹€à¸šà¸£à¸²à¸§à¹Œà¹€à¸‹à¸­à¸£à¹Œà¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸šà¸à¸¥à¹‰à¸­à¸‡
            </p>
            <div className="mt-5 space-y-4">
              <Input
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="à¸§à¸²à¸‡ URL à¸ˆà¸²à¸ QR à¸«à¸£à¸·à¸­ token"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={isSubmitting}
                  onClick={() => {
                    const parsed = parseScannedValue(tokenInput);
                    setMode(parsed.mode);
                    void submitToken(parsed.token, parsed.mode);
                  }}
                  type="button"
                >
                  {isSubmitting ? "à¸à¸³à¸¥à¸±à¸‡à¸”à¸³à¹€à¸™à¸´à¸™à¸à¸²à¸£..." : "à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥"}
                </Button>
                <Link href="/reservations" className="inline-flex h-11 items-center rounded-xl border border-zinc-200 px-4 text-sm font-medium text-zinc-700">
                  à¸à¸¥à¸±à¸šà¹„à¸›à¸«à¸™à¹‰à¸²à¸à¸²à¸£à¸ˆà¸­à¸‡
                </Link>
              </div>
              {resultMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  {resultMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-zinc-950">PIN à¸šà¸£à¸´à¹€à¸§à¸“à¸«à¸™à¹‰à¸²à¸—à¸µà¹ˆà¸ˆà¸­à¸”</h2>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-zinc-200 bg-[linear-gradient(180deg,#eff6ff,#f8fafc)] p-6">
            <div className="absolute inset-x-10 top-8 h-20 rounded-full border border-dashed border-sky-200/70" />
            <div className="absolute inset-x-16 bottom-10 h-24 rounded-full border border-dashed border-emerald-200/80" />
            <div className="grid gap-4 md:grid-cols-3">
              {parkingPins.map((pin, index) => (
                <button
                  key={pin.zone}
                  type="button"
                  onClick={() => router.push(`/parking?zone=${pin.zone}`)}
                  className={`relative rounded-[24px] border border-white/70 bg-white/85 p-5 text-left shadow-sm backdrop-blur ${index === 1 ? "mt-20" : "mt-6"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white ${pin.accent}`}>
                      {pin.zone}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{pin.title}</p>
                      <p className="text-sm text-zinc-500">{pin.detail}</p>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700">
                    à¸”à¸¹à¸Šà¹ˆà¸­à¸‡à¹ƒà¸™à¹‚à¸‹à¸™à¸™à¸µà¹‰
                    <MoveRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-sky-700" />
            <h2 className="text-lg font-semibold text-zinc-950">à¸¥à¸³à¸”à¸±à¸šà¸à¸²à¸£à¹ƒà¸Šà¹‰à¸‡à¸²à¸™</h2>
          </div>
          <div className="space-y-3">
            {[
              "1. à¹€à¸¥à¸·à¸­à¸à¸§à¹ˆà¸²à¸ˆà¸°à¸ªà¹à¸à¸™à¹€à¸‚à¹‰à¸² à¸«à¸£à¸·à¸­à¸ªà¹à¸à¸™à¸­à¸­à¸",
              "2. à¸à¸”à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¹€à¸žà¸·à¹ˆà¸­à¹„à¸›à¸«à¸™à¹‰à¸² scanner à¹‚à¸”à¸¢à¸•à¸£à¸‡",
              "3. à¸–à¹‰à¸²à¹ƒà¸Šà¹‰à¸à¸¥à¹‰à¸­à¸‡à¸¡à¸·à¸­à¸–à¸·à¸­à¸›à¸à¸•à¸´ à¸£à¸°à¸šà¸šà¸ˆà¸°à¹€à¸”à¹‰à¸‡à¹€à¸‚à¹‰à¸²à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰à¹à¸¥à¹‰à¸§à¸—à¸³à¸£à¸²à¸¢à¸à¸²à¸£à¸•à¹ˆà¸­",
              "4. à¸–à¹‰à¸²à¹€à¸›à¸´à¸”à¸à¸¥à¹‰à¸­à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰ à¹ƒà¸«à¹‰à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œà¸«à¸£à¸·à¸­ token à¹à¸—à¸™",
            ].map((item, index) => (
              <div key={item} className="flex gap-4 rounded-2xl border border-zinc-200 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-semibold text-sky-700">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-zinc-600">{item}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

