import { Bot, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

export interface CarouselGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (
    topic: string,
    count: number,
    style: string,
    mode: "full" | "template"
  ) => Promise<void>;
}

export function CarouselGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: CarouselGeneratorDialogProps) {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("Modern & Clean");
  const [count, setCount] = useState(5);
  const [mode, setMode] = useState<"full" | "template">("full");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      await onGenerate(topic, count, style, mode);
      onOpenChange(false);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            Generate Carousel
          </DialogTitle>
          <DialogDescription>
            Use AI to create a multi-slide carousel on any topic.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Textarea
              id="topic"
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 5 Tips for Better Productivity, How to cook Pasta..."
              value={topic}
            />
          </div>

          <div className="space-y-2">
            <Label>Number of Slides: {count}</Label>
            <Slider
              max={10}
              min={3}
              onValueChange={(val) => setCount(val[0])}
              step={1}
              value={[count]}
            />
            <div className="flex justify-between px-1 text-muted-foreground text-xs">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style / Vibe</Label>
            <Input
              id="style"
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Minimal, Bold, Colorful..."
              value={style}
            />
          </div>

          <div className="space-y-2">
            <Label>Generation Mode</Label>
            <RadioGroup
              className="flex gap-4"
              defaultValue="full"
              onValueChange={(v) => setMode(v as "full" | "template")}
              value={mode}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="mode-full" value="full" />
                <Label htmlFor="mode-full">Full Theme</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="mode-template" value="template" />
                <Label htmlFor="mode-template">Template Only</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end pt-2">
            <Button disabled={!topic || isGenerating} onClick={handleGenerate}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
