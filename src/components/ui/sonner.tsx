import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      offset="calc(env(safe-area-inset-top, 0px) + 12px)"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-full px-5 py-3 backdrop-blur-md bg-[rgba(30,30,40,0.92)] text-white border border-white/10 shadow-lg text-sm font-medium",
          description: "group-[.toast]:text-white/70 text-xs",
          actionButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white rounded-full text-xs",
          cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-white/70 rounded-full text-xs",
          error: "group-[.toaster]:bg-[rgba(180,30,30,0.92)] group-[.toaster]:border-red-400/20",
          success: "group-[.toaster]:bg-[rgba(20,120,60,0.92)] group-[.toaster]:border-green-400/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
