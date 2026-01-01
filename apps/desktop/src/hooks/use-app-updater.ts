import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UpdateState {
  checking: boolean;
  downloading: boolean;
  progress: number;
  available: Update | null;
}

/**
 * Hook to check for app updates on mount and provide update functionality.
 * Shows sonner toasts for update notifications.
 */
export function useAppUpdater() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    downloading: false,
    progress: 0,
    available: null,
  });
  const hasChecked = useRef(false);

  const checkForUpdate = async () => {
    if (state.checking || state.downloading) {
      return;
    }

    setState((s) => ({ ...s, checking: true }));

    try {
      const update = await check();

      if (update) {
        setState((s) => ({ ...s, checking: false, available: update }));

        toast("Update Available", {
          description: `Version ${update.version} is ready to install.`,
          duration: 10_000,
          action: {
            label: "Install",
            onClick: () => downloadAndInstall(update),
          },
        });
      } else {
        setState((s) => ({ ...s, checking: false }));
      }
    } catch (error) {
      console.error("Update check failed:", error);
      setState((s) => ({ ...s, checking: false }));
    }
  };

  const downloadAndInstall = async (update: Update) => {
    setState((s) => ({ ...s, downloading: true, progress: 0 }));

    const toastId = toast.loading("Downloading update...", {
      description: "0%",
    });

    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const progress =
            totalBytes > 0
              ? Math.round((downloadedBytes / totalBytes) * 100)
              : 0;
          setState((s) => ({ ...s, progress }));
          toast.loading("Downloading update...", {
            id: toastId,
            description: `${progress}%`,
          });
        } else if (event.event === "Finished") {
          toast.success("Update downloaded", {
            id: toastId,
            description: "Restarting app...",
          });
        }
      });

      // Relaunch the app
      await relaunch();
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Update failed", {
        id: toastId,
        description: "Please try again later.",
      });
      setState((s) => ({ ...s, downloading: false }));
    }
  };

  // Check for updates on mount (once)
  useEffect(() => {
    if (hasChecked.current) {
      return;
    }
    hasChecked.current = true;

    // Delay initial check to not block app startup
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  return {
    ...state,
    checkForUpdate,
  };
}
