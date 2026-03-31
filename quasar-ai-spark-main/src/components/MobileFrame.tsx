import { ReactNode } from "react";

const MobileFrame = ({ children }: { children: ReactNode }) => (
  <div className="relative mx-auto w-full max-w-[430px] min-h-screen overflow-hidden bg-background">
    {children}
  </div>
);

export default MobileFrame;
