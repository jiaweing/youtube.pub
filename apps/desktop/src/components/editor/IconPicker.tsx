import * as HugeIcons from "hugeicons-react";
import * as LucideIcons from "lucide-react";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IconPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dataUrl: string) => void;
}

export function IconPicker({ open, onOpenChange, onSelect }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("lucide");

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

  const filteredIcons = useMemo(() => {
    const list = activeTab === "lucide" ? lucideList : hugeList;
    if (!list) return [];
    if (!searchTerm) return list.slice(0, 100);
    const lower = searchTerm.toLowerCase();
    return list
      .filter((name) => name && name.toLowerCase().includes(lower))
      .slice(0, 100);
  }, [activeTab, searchTerm, lucideList, hugeList]);

  const handleSelect = (name: string, library: "lucide" | "huge") => {
    try {
      const Icon =
        library === "lucide"
          ? (LucideIcons as any)[name]
          : (HugeIcons as any)[name];
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lucide">Lucide Icons</TabsTrigger>
            <TabsTrigger value="huge">Huge Icons</TabsTrigger>
          </TabsList>

          <TabsContent className="mt-2 min-h-0 flex-1" value="lucide">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-6 gap-2 p-2 sm:grid-cols-8 md:grid-cols-10">
                {filteredIcons.map((name) => {
                  const Icon = (LucideIcons as any)[name];
                  return (
                    <button
                      className="flex flex-col items-center gap-1 rounded border border-transparent p-2 transition-colors hover:border-border hover:bg-muted"
                      key={name}
                      onClick={() => handleSelect(name, "lucide")}
                      title={name}
                    >
                      <Icon className="size-6" />
                      <span className="w-full truncate text-center text-[10px] opacity-60">
                        {name}
                      </span>
                    </button>
                  );
                })}
                {filteredIcons.length === 0 && (
                  <div className="col-span-full py-10 text-center text-muted-foreground">
                    No icons found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="mt-2 min-h-0 flex-1" value="huge">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-6 gap-2 p-2 sm:grid-cols-8 md:grid-cols-10">
                {filteredIcons.map((name) => {
                  const Icon = (HugeIcons as any)[name];
                  return (
                    <button
                      className="flex flex-col items-center gap-1 rounded border border-transparent p-2 transition-colors hover:border-border hover:bg-muted"
                      key={name}
                      onClick={() => handleSelect(name, "huge")}
                      title={name}
                    >
                      <Icon className="size-6" />
                      <span className="w-full truncate text-center text-[10px] opacity-60">
                        {name}
                      </span>
                    </button>
                  );
                })}
                {filteredIcons.length === 0 && (
                  <div className="col-span-full py-10 text-center text-muted-foreground">
                    No icons found
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
