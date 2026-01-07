import * as HugeIcons from "hugeicons-react";
import * as LucideIcons from "lucide-react";
import { Loader2, Search } from "lucide-react";
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useMemo,
  useState,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtuosoGrid } from "react-virtuoso";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getAllFluentEmojis,
  getFluentEmojiUrl,
} from "@/lib/fluent-emoji-manifest";

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dataUrl: string) => void;
}

// Stable grid components for VirtuosoGrid (defined outside to prevent remounting)
const IconGridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, style, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      {...props}
      className="grid grid-cols-6 gap-2 p-2"
    >
      {children}
    </div>
  )
);
IconGridList.displayName = "IconGridList";

const IconGridItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
);
IconGridItem.displayName = "IconGridItem";

const iconGridComponents = {
  List: IconGridList,
  Item: IconGridItem,
};

export function IconPicker({ open, onOpenChange, onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("lucide");
  const [loadingEmoji, setLoadingEmoji] = useState<string | null>(null);

  const lucideList = useMemo(() => {
    try {
      if (!LucideIcons) {
        console.error("LucideIcons import is undefined");
        return [];
      }
      return Object.keys(LucideIcons).filter(
        (key) =>
          key !== "createLucideIcon" && key !== "icons" && /^[A-Z]/.test(key)
      );
    } catch (e) {
      console.error("Error loading Lucide icons", e);
      return [];
    }
  }, []);

  const hugeList = useMemo(() => {
    try {
      if (!HugeIcons) {
        console.warn("HugeIcons import is undefined");
        return [];
      }
      return Object.keys(HugeIcons).filter((key) => /^[A-Z]/.test(key));
    } catch (e) {
      console.error("Error loading Huge icons", e);
      return [];
    }
  }, []);

  const fluentList = useMemo(() => getAllFluentEmojis(), []);

  const filteredIcons = useMemo(() => {
    const list = activeTab === "lucide" ? lucideList : hugeList;
    if (!list) return [];
    if (!searchTerm) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter((name) => name && name.toLowerCase().includes(lower));
  }, [activeTab, searchTerm, lucideList, hugeList]);

  const filteredFluentEmojis = useMemo(() => {
    if (!searchTerm) return fluentList;
    const lower = searchTerm.toLowerCase();
    return fluentList.filter(
      (emoji) =>
        emoji.name.toLowerCase().includes(lower) ||
        emoji.category.toLowerCase().includes(lower)
    );
  }, [searchTerm, fluentList]);

  const handleSelect = (name: string, library: "lucide" | "huge") => {
    try {
      const Icon =
        library === "lucide"
          ? (
              LucideIcons as Record<
                string,
                React.ComponentType<{
                  color?: string;
                  height?: number;
                  width?: number;
                  size?: number;
                  strokeWidth?: number;
                  className?: string;
                }>
              >
            )[name]
          : (
              HugeIcons as Record<
                string,
                React.ComponentType<{
                  color?: string;
                  height?: number;
                  width?: number;
                  size?: number;
                  strokeWidth?: number;
                  className?: string;
                }>
              >
            )[name];
      if (!Icon) return;

      if (!renderToStaticMarkup) {
        console.error("renderToStaticMarkup is undefined");
        return;
      }

      // Render large high-quality SVG
      const svgString = renderToStaticMarkup(
        <Icon
          color="#000000"
          height={128}
          size={128}
          strokeWidth={library === "lucide" ? 2 : undefined}
          width={128}
        />
      );

      let finalSvg = svgString;
      // Ensure xmlns for data URI
      if (!finalSvg.includes("xmlns")) {
        finalSvg = finalSvg.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"'
        );
      }

      const dataUrl = `data:image/svg+xml;base64,${btoa(
        unescape(encodeURIComponent(finalSvg))
      )}`;
      onSelect(dataUrl);
      onOpenChange(false);
    } catch (e) {
      console.error("Icon render error", e);
    }
  };

  // Handle Fluent Emoji selection - load image and convert to data URL
  const handleFluentSelect = useCallback(
    async (folder: string, name: string) => {
      setLoadingEmoji(name);
      try {
        const url = getFluentEmojiUrl(folder, name);
        const response = await fetch(url);
        const blob = await response.blob();

        // Convert blob to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          onSelect(dataUrl);
          onOpenChange(false);
          setLoadingEmoji(null);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("Error loading emoji", e);
        setLoadingEmoji(null);
      }
    },
    [onSelect, onOpenChange]
  );

  const renderIconButton = (name: string, library: "lucide" | "huge") => {
    const Icon =
      library === "lucide"
        ? (
            LucideIcons as Record<
              string,
              React.ComponentType<{ className?: string }>
            >
          )[name]
        : (
            HugeIcons as Record<
              string,
              React.ComponentType<{ className?: string }>
            >
          )[name];
    if (!Icon) return null;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center justify-center rounded border border-transparent p-2 transition-colors hover:border-border hover:bg-muted"
            onClick={() => handleSelect(name, library)}
          >
            <Icon className="size-7" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{name}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderFluentEmojiButton = (
    emoji: { name: string; category: string; folder: string },
    index: number
  ) => {
    const isLoading = loadingEmoji === emoji.name;
    const url = getFluentEmojiUrl(emoji.folder, emoji.name);

    return (
      <Tooltip key={`${emoji.folder}-${emoji.name}-${index}`}>
        <TooltipTrigger asChild>
          <button
            className="flex items-center justify-center rounded border border-transparent p-2 transition-colors hover:border-border hover:bg-muted disabled:opacity-50"
            disabled={isLoading}
            onClick={() => handleFluentSelect(emoji.folder, emoji.name)}
          >
            {isLoading ? (
              <Loader2 className="size-7 animate-spin" />
            ) : (
              <img
                alt={emoji.name}
                className="size-7 object-contain"
                loading="lazy"
                src={url}
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{emoji.name}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Icon Picker</DialogTitle>
        </DialogHeader>

        <div className="my-2 flex items-center space-x-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="flex-1"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search icons..."
            value={searchTerm}
          />
        </div>

        <Tabs
          className="flex min-h-0 flex-1 flex-col"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lucide">
              Lucide (
              {activeTab === "lucide"
                ? filteredIcons.length
                : lucideList.length}
              )
            </TabsTrigger>
            <TabsTrigger value="huge">
              Huge (
              {activeTab === "huge" ? filteredIcons.length : hugeList.length})
            </TabsTrigger>
            <TabsTrigger value="fluent">
              Fluent (
              {activeTab === "fluent"
                ? filteredFluentEmojis.length
                : fluentList.length}
              )
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-2 min-h-0 flex-1" value="lucide">
            {filteredIcons.length === 0 ? (
              <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
                No icons found
              </div>
            ) : (
              <VirtuosoGrid
                components={iconGridComponents}
                itemContent={(index) =>
                  renderIconButton(filteredIcons[index], "lucide")
                }
                overscan={200}
                style={{ height: "100%", width: "100%" }}
                totalCount={filteredIcons.length}
              />
            )}
          </TabsContent>

          <TabsContent className="mt-2 min-h-0 flex-1" value="huge">
            {filteredIcons.length === 0 ? (
              <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
                No icons found
              </div>
            ) : (
              <VirtuosoGrid
                components={iconGridComponents}
                itemContent={(index) =>
                  renderIconButton(filteredIcons[index], "huge")
                }
                overscan={200}
                style={{ height: "100%", width: "100%" }}
                totalCount={filteredIcons.length}
              />
            )}
          </TabsContent>

          <TabsContent className="mt-2 min-h-0 flex-1" value="fluent">
            {filteredFluentEmojis.length === 0 ? (
              <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
                No emojis found
              </div>
            ) : (
              <VirtuosoGrid
                components={iconGridComponents}
                itemContent={(index) =>
                  renderFluentEmojiButton(filteredFluentEmojis[index], index)
                }
                overscan={200}
                style={{ height: "100%", width: "100%" }}
                totalCount={filteredFluentEmojis.length}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
