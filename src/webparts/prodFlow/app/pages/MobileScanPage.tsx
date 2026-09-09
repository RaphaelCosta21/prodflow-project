import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@fluentui/react-components";
import { Camera24Regular, ArrowRight20Regular } from "@fluentui/react-icons";
import { useFidsFull } from "../api/fids";
import { useUIStore } from "../stores/useUIStore";
import { fidDetailPath } from "../config/routes";
import GlassCard from "../components/common/GlassCard";
import EmptyState from "../components/common/EmptyState";
import styles from "./MobileScanPage.module.scss";

interface IBarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => IBarcodeDetectorLike;

// Accepts a full QR URL (…#/fid/FID00001) or a bare FID typed by hand.
function extractFid(raw: string): string | undefined {
  const match = /FID\d{5}/i.exec(raw);
  return match ? match[0].toUpperCase() : undefined;
}

export const MobileScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { data } = useFidsFull();
  const addToast = useUIStore((s) => s.addToast);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | undefined>(undefined);
  const [scanning, setScanning] = React.useState(false);
  const [manual, setManual] = React.useState("");

  const detectorSupported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  const stop = React.useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = undefined;
    }
    setScanning(false);
  }, []);

  React.useEffect(() => stop, [stop]);

  const open = (raw: string): void => {
    const fid = extractFid(raw);
    if (!fid) {
      addToast("Nenhum FID reconhecido no código.", "warning");
      return;
    }
    const known = (data ?? []).some((r) => r.fid === fid);
    if (!known) {
      addToast(`${fid} não encontrado.`, "warning");
      return;
    }
    stop();
    navigate(fidDetailPath(fid));
  };

  const start = async (): Promise<void> => {
    if (!detectorSupported) {
      addToast(
        "Este navegador não suporta leitura de QR. Digite o FID abaixo.",
        "warning",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Ctor = (
        window as unknown as { BarcodeDetector: BarcodeDetectorCtor }
      ).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async (): Promise<void> => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            open(codes[0].rawValue);
            return;
          }
        } catch {
          // A frame can fail to decode; keep polling.
        }
        setTimeout(() => {
          tick().catch(() => undefined);
        }, 400);
      };
      tick().catch(() => undefined);
    } catch {
      addToast("Não foi possível acessar a câmera.", "error");
      stop();
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Mobile Scan</h1>
        <span className={styles.phase}>Tools</span>
      </div>

      <GlassCard
        title="Escanear etiqueta"
        subtitle="Aponte a câmera para o QR da etiqueta para abrir o FID."
      >
        <div className={styles.scanner}>
          {scanning ? (
            <video ref={videoRef} className={styles.video} muted playsInline />
          ) : (
            <EmptyState
              title="Câmera desligada"
              description={
                detectorSupported
                  ? "Toque em Iniciar para ler o QR."
                  : "Seu navegador não suporta leitura de QR — use a busca manual."
              }
            />
          )}
          <div className={styles.actions}>
            {scanning ? (
              <Button onClick={stop}>Parar</Button>
            ) : (
              <Button
                appearance="primary"
                icon={<Camera24Regular />}
                disabled={!detectorSupported}
                onClick={() => {
                  start().catch(() => undefined);
                }}
              >
                Iniciar câmera
              </Button>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard
        title="Busca manual"
        subtitle="Digite ou cole o FID da etiqueta."
      >
        <div className={styles.manualRow}>
          <Input
            value={manual}
            placeholder="FID00001"
            onChange={(_, d) => setManual(d.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") open(manual);
            }}
          />
          <Button
            appearance="primary"
            icon={<ArrowRight20Regular />}
            disabled={!manual.trim()}
            onClick={() => open(manual)}
          >
            Abrir
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};

export default MobileScanPage;
