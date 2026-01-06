import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  ExternalLink,
  Key,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getGeminiApiKey,
  removeGeminiApiKey,
  setGeminiApiKey,
} from "@/lib/gemini-store";
import { POLAR_CONFIG } from "@/lib/polar-config";
import { useLicenseStore } from "@/stores/use-license-store";

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="relative z-[110] flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm">Settings</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <Tabs
          className="flex flex-1"
          defaultValue="api-key"
          orientation="vertical"
        >
          {/* Left sidebar tabs */}
          <TabsList className="flex h-full w-56 flex-col items-stretch justify-start gap-1 rounded-none border-none bg-transparent p-4">
            <TabsTrigger
              className="justify-start gap-2 border-none px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
              value="api-key"
            >
              <Key className="size-4" />
              API Key
            </TabsTrigger>
            <TabsTrigger
              className="justify-start gap-2 border-none px-3 py-2 data-[state=active]:bg-muted data-[state=active]:shadow-none"
              value="billing"
            >
              <CreditCard className="size-4" />
              Billing
            </TabsTrigger>
          </TabsList>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl">
              <TabsContent className="mt-0" value="api-key">
                <ApiKeySettings />
              </TabsContent>

              <TabsContent className="mt-0" value="billing">
                <BillingSettings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function ApiKeySettings() {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getGeminiApiKey()
      .then((key) => {
        setHasKey(!!key);
        setApiKey("");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    try {
      await setGeminiApiKey(apiKey.trim());
      setHasKey(true);
      setApiKey("");
      toast.success("API key saved securely");
    } catch (error) {
      toast.error("Failed to save API key");
    }
  }, [apiKey]);

  const handleRemove = useCallback(async () => {
    try {
      await removeGeminiApiKey();
      setHasKey(false);
      toast.success("API key removed");
    } catch (error) {
      toast.error("Failed to remove API key");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-lg">Gemini API Key</h2>
        <p className="text-muted-foreground text-sm">
          Enter your Gemini API key to enable AI image generation features.
        </p>
      </div>

      {hasKey ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
              <Key className="size-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">API key configured</p>
              <p className="text-muted-foreground text-sm">
                Your Gemini API key is securely stored
              </p>
            </div>
          </div>
          <Button onClick={handleRemove} size="sm" variant="destructive">
            <Trash2 className="mr-2 size-4" />
            Remove
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
              placeholder="Enter your Gemini API key"
              type="password"
              value={apiKey}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
              onClick={() => openUrl("https://aistudio.google.com/apikey")}
              type="button"
            >
              <ExternalLink className="size-3" />
              Get your API key from Google AI Studio
            </button>
            <Button disabled={!apiKey.trim()} onClick={handleSave}>
              Save Key
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BillingSettings() {
  const { validatedData, clearLicense } = useLicenseStore();

  const handleManageLicense = useCallback(() => {
    openUrl(POLAR_CONFIG.customerPortalUrl);
  }, []);

  const handleDeactivate = useCallback(async () => {
    await clearLicense();
    toast.success("License deactivated");
  }, [clearLicense]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-lg">Billing & License</h2>
        <p className="text-muted-foreground text-sm">
          Manage your license and billing information.
        </p>
      </div>

      {/* License Status */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10">
              <BadgeCheck className="size-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium">Lifetime License</p>
              <p className="text-muted-foreground text-sm">
                {validatedData?.customerEmail || "Active"}
                {validatedData?.expiresAt
                  ? ` · Expires ${new Date(validatedData.expiresAt).toLocaleDateString()}`
                  : " · No expiry"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleManageLicense} size="sm" variant="ghost">
              <ExternalLink className="mr-2 size-4" />
              Manage License
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
          <div>
            <p className="font-medium">Customer Portal</p>
            <p className="text-muted-foreground text-sm">
              View invoices, update payment info, and manage your subscription.
            </p>
          </div>
          <Button onClick={handleManageLicense} variant="ghost">
            <ExternalLink className="mr-2 size-4" />
            Open Portal
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-destructive/5 p-4">
          <div>
            <p className="font-medium text-destructive">Deactivate License</p>
            <p className="text-muted-foreground text-sm">
              Remove your license from this device.
            </p>
          </div>
          <Button onClick={handleDeactivate} variant="destructive">
            Deactivate
          </Button>
        </div>
      </div>
    </div>
  );
}
