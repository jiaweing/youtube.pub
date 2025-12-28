import { AlertCircle, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CompareSlider,
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderHandle,
} from "@/components/ui/compare-slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  base64ToDataUrl,
  GEMINI_IMAGE_MODELS,
  type GeminiImageModel,
  generateImageWithGemini,
} from "@/lib/gemini-image";
import { getGeminiApiKey } from "@/lib/gemini-store";

interface GeminiImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputImageDataUrl: string;
  onSaveAsLayer: (dataUrl: string) => void;
}

export function GeminiImageDialog({
  open,
  onOpenChange,
  inputImageDataUrl,
  onSaveAsLayer,
}: GeminiImageDialogProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<GeminiImageModel>(
    GEMINI_IMAGE_MODELS[0].value
  );
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null
  );
  const [currentInputUrl, setCurrentInputUrl] = useState(inputImageDataUrl);
  const [error, setError] = useState<string | null>(null);

  // Load API key on open
  useEffect(() => {
    if (open) {
      getGeminiApiKey().then(setApiKey);
      setGeneratedImageUrl(null);
      setCurrentInputUrl(inputImageDataUrl);
      setPrompt("");
      setError(null);
    }
  }, [open, inputImageDataUrl]);

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setError("Please configure your Gemini API key first");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateImageWithGemini(
        apiKey,
        model,
        prompt.trim(),
        currentInputUrl
      );
      const newImageUrl = base64ToDataUrl(result.imageBase64, result.mimeType);
      setGeneratedImageUrl(newImageUrl);
      toast.success("Image generated successfully");
    } catch (err) {
      console.error("Generation failed:", err);
      const message =
        err instanceof Error ? err.message : "Failed to generate image";
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, model, prompt, currentInputUrl]);

  const handleContinueWithGenerated = useCallback(() => {
    if (generatedImageUrl) {
      setCurrentInputUrl(generatedImageUrl);
      setGeneratedImageUrl(null);
      setPrompt("");
      toast.info("Using generated image as new input");
    }
  }, [generatedImageUrl]);

  const handleSaveAsLayer = useCallback(() => {
    if (generatedImageUrl) {
      onSaveAsLayer(generatedImageUrl);
      toast.success("Saved as new layer");
      onOpenChange(false);
    }
  }, [generatedImageUrl, onSaveAsLayer, onOpenChange]);

  const hasApiKey = apiKey !== null && apiKey.length > 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Image</DialogTitle>
          <DialogDescription>
            Use Gemini image models to transform or edit your image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {!hasApiKey && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm text-yellow-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Please configure your Gemini API key in the title bar settings
                to use AI generation.
              </span>
            </div>
          )}

          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs" htmlFor="model-select">
              Model
            </Label>
            <Select
              onValueChange={(v) => setModel(v as GeminiImageModel)}
              value={model}
            >
              <SelectTrigger id="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GEMINI_IMAGE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt Input */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs" htmlFor="prompt">
              Prompt
            </Label>
            <Textarea
              disabled={!hasApiKey || isGenerating}
              id="prompt"
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to transform the image..."
              rows={3}
              value={prompt}
            />
          </div>

          {/* Image Preview */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs">Preview</Label>
            {generatedImageUrl ? (
              <CompareSlider className="aspect-video max-h-80 overflow-hidden rounded-lg border border-border">
                <CompareSliderAfter label="Generated">
                  <img
                    alt="Generated"
                    className="h-full w-full object-contain"
                    src={generatedImageUrl}
                  />
                </CompareSliderAfter>
                <CompareSliderBefore label="Original">
                  <img
                    alt="Original"
                    className="h-full w-full object-contain"
                    src={currentInputUrl}
                  />
                </CompareSliderBefore>
                <CompareSliderHandle />
              </CompareSlider>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <img
                  alt="Input"
                  className="max-h-60 w-full object-contain"
                  src={currentInputUrl}
                />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 overflow-hidden rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span className="overflow-wrap-anywhere min-w-0 break-words">
                {error}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {generatedImageUrl && (
            <>
              <Button
                className="w-full sm:w-auto"
                onClick={handleContinueWithGenerated}
                size="sm"
                variant="ghost"
              >
                Continue with Generated
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveAsLayer}
                size="sm"
              >
                <Save className="mr-1 size-4" />
                Save as Layer
              </Button>
            </>
          )}
          {!generatedImageUrl && (
            <>
              <Button
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={!(hasApiKey && prompt.trim()) || isGenerating}
                onClick={handleGenerate}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
