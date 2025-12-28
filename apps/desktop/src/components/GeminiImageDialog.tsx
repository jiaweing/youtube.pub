import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

interface GeminiImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputImageDataUrl: string;
  onSaveAsLayer: (dataUrl: string) => void;
}

interface GeneratedImage {
  url: string;
  index: number;
}

const GENERATION_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

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
  const [generationCount, setGenerationCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentInputUrl, setCurrentInputUrl] = useState(inputImageDataUrl);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Load API key on open
  useEffect(() => {
    if (open) {
      getGeminiApiKey().then(setApiKey);
      setGeneratedImages([]);
      setSelectedImageIndex(0);
      setCurrentInputUrl(inputImageDataUrl);
      setPrompt("");
      setError(null);
      setProgress({ current: 0, total: 0 });
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
    setGeneratedImages([]);
    setSelectedImageIndex(0);
    setProgress({ current: 0, total: generationCount });

    const results: GeneratedImage[] = [];
    let errorCount = 0;

    // Generate images in parallel
    const promises = Array.from({ length: generationCount }, async (_, i) => {
      try {
        const result = await generateImageWithGemini(
          apiKey,
          model,
          prompt.trim(),
          currentInputUrl
        );
        const newImageUrl = base64ToDataUrl(
          result.imageBase64,
          result.mimeType
        );
        results.push({ url: newImageUrl, index: i });
        setProgress((p) => ({ ...p, current: p.current + 1 }));
        // Update results as they come in
        setGeneratedImages([...results].sort((a, b) => a.index - b.index));
      } catch (err) {
        errorCount++;
        console.error(`Generation ${i + 1} failed:`, err);
      }
    });

    await Promise.all(promises);

    setIsGenerating(false);

    if (results.length > 0) {
      toast.success(
        `Generated ${results.length} image${results.length > 1 ? "s" : ""}`
      );
    }
    if (errorCount > 0) {
      toast.error(
        `${errorCount} generation${errorCount > 1 ? "s" : ""} failed`
      );
    }
    if (results.length === 0) {
      setError("All generations failed. Please try again.");
    }
  }, [apiKey, model, prompt, currentInputUrl, generationCount]);

  const handleContinueWithGenerated = useCallback(() => {
    const selectedImage = generatedImages[selectedImageIndex];
    if (selectedImage) {
      setCurrentInputUrl(selectedImage.url);
      setGeneratedImages([]);
      setSelectedImageIndex(0);
      setPrompt("");
      toast.info("Using generated image as new input");
    }
  }, [generatedImages, selectedImageIndex]);

  const handleSaveAsLayer = useCallback(() => {
    const selectedImage = generatedImages[selectedImageIndex];
    if (selectedImage) {
      onSaveAsLayer(selectedImage.url);
      toast.success("Saved as new layer");
      onOpenChange(false);
    }
  }, [generatedImages, selectedImageIndex, onSaveAsLayer, onOpenChange]);

  const handleSaveAll = useCallback(() => {
    for (const img of generatedImages) {
      onSaveAsLayer(img.url);
    }
    toast.success(`Saved ${generatedImages.length} images as layers`);
    onOpenChange(false);
  }, [generatedImages, onSaveAsLayer, onOpenChange]);

  const hasApiKey = apiKey !== null && apiKey.length > 0;
  const hasGeneratedImages = generatedImages.length > 0;
  const selectedImage = generatedImages[selectedImageIndex];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
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
            <div className="flex items-center justify-between">
              <Label className="text-xs">Preview</Label>
              {isGenerating && progress.total > 1 && (
                <span className="text-muted-foreground text-xs">
                  {progress.current}/{progress.total} generated
                </span>
              )}
            </div>

            {hasGeneratedImages ? (
              <div className="flex flex-col gap-3">
                {/* Main compare slider for selected image */}
                <div className="relative">
                  <CompareSlider className="aspect-video max-h-80 overflow-hidden rounded-lg border border-border">
                    <CompareSliderAfter>
                      <img
                        alt="Generated"
                        className="h-full w-full object-contain"
                        src={selectedImage?.url}
                      />
                    </CompareSliderAfter>
                    <CompareSliderBefore>
                      <img
                        alt="Original"
                        className="h-full w-full object-contain"
                        src={currentInputUrl}
                      />
                    </CompareSliderBefore>
                    <CompareSliderHandle />
                    {/* Always visible labels */}
                    <span className="pointer-events-none absolute top-2 left-2 z-30 rounded-md border border-border bg-background/80 px-2 py-1 font-medium text-xs backdrop-blur-sm">
                      Original
                    </span>
                    <span className="pointer-events-none absolute top-2 right-2 z-30 rounded-md border border-border bg-background/80 px-2 py-1 font-medium text-xs backdrop-blur-sm">
                      Generated{" "}
                      {generatedImages.length > 1 ? selectedImageIndex + 1 : ""}
                    </span>
                  </CompareSlider>

                  {/* Navigation arrows for multiple images */}
                  {generatedImages.length > 1 && (
                    <>
                      <Button
                        className="absolute top-1/2 left-2 -translate-y-1/2"
                        disabled={selectedImageIndex === 0}
                        onClick={() => setSelectedImageIndex((i) => i - 1)}
                        size="icon-sm"
                        variant="secondary"
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      <Button
                        className="absolute top-1/2 right-2 -translate-y-1/2"
                        disabled={
                          selectedImageIndex === generatedImages.length - 1
                        }
                        onClick={() => setSelectedImageIndex((i) => i + 1)}
                        size="icon-sm"
                        variant="secondary"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Thumbnail grid for multiple images */}
                {generatedImages.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {generatedImages.map((img, idx) => (
                      <button
                        className={cn(
                          "relative size-16 cursor-pointer overflow-hidden rounded-md border-2 transition-all hover:opacity-90",
                          idx === selectedImageIndex
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border"
                        )}
                        key={img.index}
                        onClick={() => setSelectedImageIndex(idx)}
                        type="button"
                      >
                        <img
                          alt={`Generated ${idx + 1}`}
                          className="h-full w-full object-cover"
                          src={img.url}
                        />
                        <span className="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-1 font-medium text-[10px] text-white">
                          {idx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
          {hasGeneratedImages && (
            <>
              <Button
                className="w-full sm:w-auto"
                onClick={handleContinueWithGenerated}
                size="sm"
                variant="ghost"
              >
                Continue with Selected
              </Button>
              {generatedImages.length > 1 && (
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSaveAll}
                  size="sm"
                  variant="outline"
                >
                  <Save className="mr-1 size-4" />
                  Save All ({generatedImages.length})
                </Button>
              )}
              <Button
                className="w-full sm:w-auto"
                onClick={handleSaveAsLayer}
                size="sm"
              >
                <Save className="mr-1 size-4" />
                Save Selected
              </Button>
            </>
          )}
          {!hasGeneratedImages && (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1">
                <Select
                  onValueChange={(v) => setModel(v as GeminiImageModel)}
                  value={model}
                >
                  <SelectTrigger
                    className="!h-7 !bg-transparent w-auto border-0 px-2"
                    id="model-select"
                  >
                    <SelectValue>
                      {
                        GEMINI_IMAGE_MODELS.find((m) => m.value === model)
                          ?.label
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_IMAGE_MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  disabled={isGenerating}
                  onValueChange={(v) => setGenerationCount(Number(v))}
                  value={String(generationCount)}
                >
                  <SelectTrigger
                    className="!h-7 !bg-transparent w-14 border-0 px-2"
                    id="count-select"
                  >
                    <SelectValue>{generationCount}×</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_COUNTS.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
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
                      {progress.total > 1
                        ? `${progress.current}/${progress.total}`
                        : "Generating..."}
                    </>
                  ) : (
                    <>Generate</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
