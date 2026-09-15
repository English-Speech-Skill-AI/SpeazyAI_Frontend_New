import { useState, useEffect, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Phone } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "./ui/use-mobile";

interface MelloAssistantProps {
  state?:
    | "idle"
    | "talking"
    | "waving"
    | "celebrating"
    | "thinking";
  message?: string;
  showMessage?: boolean;
  onMessageDismiss?: () => void;
  position?: "bottom-right" | "bottom-left" | "center";
  onClick?: () => void;
  showConnectTeacher?: boolean;
  /** When set, shows "Need Support?" button and opens mailto; otherwise "Connect with Teacher" navigates to connect-teacher */
  supportEmail?: string;
  /** When set, clicking "Need Support?" calls this instead of mailto (opens support chatbot) */
  onSupportClick?: () => void;
  /** Hide on mobile to prevent overlap; defaults to false */
  hideOnMobile?: boolean;
  /** Auto-dismiss popup after seconds; 0 = never. Default 5. */
  autoDismissSeconds?: number;
}

export function MelloAssistant({
  state = "idle",
  message = "Hi! I'm Mello, your AI learning companion!",
  showMessage = true,
  onMessageDismiss,
  position = "bottom-right",
  onClick,
  showConnectTeacher = false,
  supportEmail,
  onSupportClick,
  hideOnMobile = false,
  autoDismissSeconds = 5,
}: MelloAssistantProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeScale, setEyeScale] = useState(1);

  useEffect(() => {
    if (showMessage && autoDismissSeconds > 0 && onMessageDismiss && !showConnectTeacher) {
      const t = setTimeout(onMessageDismiss, autoDismissSeconds * 1000);
      return () => clearTimeout(t);
    }
  }, [showMessage, autoDismissSeconds, onMessageDismiss, showConnectTeacher]);

  useEffect(() => {
    document.body.classList.add("mello-visible");
    return () => document.body.classList.remove("mello-visible");
  }, []);

  useEffect(() => {
    const blinkInterval = setInterval(
      () => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      },
      3000 + Math.random() * 2000,
    );

    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const sparkleInterval = setInterval(() => {
      setEyeScale(1.1);
      setTimeout(() => setEyeScale(1), 200);
    }, 4000);

    return () => clearInterval(sparkleInterval);
  }, []);

  // Adjust chatbox position to avoid overlapping with content
  const chatboxPositionClasses = {
    "bottom-right": "bottom-full mb-4 right-0 translate-x-0",
    "bottom-left": "bottom-full mb-4 left-0 -translate-x-0",
    center: "bottom-full mb-4 left-1/2 -translate-x-1/2",
  };
  
  // Subtle floating - reduced on mobile to avoid distraction
  const floatingAnimation = isMobile ? { y: [0, -4, 0] } : state === "waving"
    ? { y: [0, -10, 0], rotate: [0, -2, 2, 0] }
    : { y: [0, -6, 0] };
  const floatingDuration = isMobile ? 4 : state === "waving" ? 2.5 : 3;

  // Use larger minimum on mobile so the icon is never clipped (e.g. by device frame or home indicator)
  const safeBottom = "max(20px, env(safe-area-inset-bottom, 0px))";
  const safeRight = "max(20px, env(safe-area-inset-right, 0px))";
  const safeLeft = "max(20px, env(safe-area-inset-left, 0px))";

  const positionStyles: CSSProperties =
    position === "bottom-right"
      ? {
          bottom: isMobile ? safeBottom : 24,
          right: isMobile ? safeRight : 24,
          ...(isMobile && { paddingBottom: 8, paddingRight: 8 }),
        }
      : position === "bottom-left"
        ? {
            bottom: isMobile ? safeBottom : 24,
            left: isMobile ? safeLeft : 24,
            ...(isMobile && { paddingBottom: 8, paddingLeft: 8 }),
          }
        : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const iconSize = isMobile ? 52 : 80;

  if (hideOnMobile && isMobile) return null;

  return (
    <div
      style={{ position: "fixed", zIndex: 9999, ...positionStyles }}
      data-mello-assistant
    >
      <AnimatePresence>
        {showMessage && message && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8, pointerEvents: "none" }}
            transition={{ duration: 0.3, type: "spring" }}
            className={`absolute ${chatboxPositionClasses[position]} z-[60] pointer-events-auto`}
            style={{ 
              maxWidth: isMobile ? "min(320px, calc(100vw - 32px))" : "320px",
              minWidth: isMobile ? "260px" : "280px",
            }}
          >
            <div className="relative bg-gradient-to-br from-white to-[#F2F3F4] border-2 border-[#3B82F6]/30 rounded-2xl p-4 shadow-2xl">
              <div className="absolute -bottom-2 right-12 w-4 h-4 bg-white border-r-2 border-b-2 border-[#3B82F6]/30 transform rotate-45" />
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <p className="text-[#1E3A8A] text-sm leading-relaxed flex-1">
                    {message}
                  </p>
                  {onMessageDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMessageDismiss();
                      }}
                      className="p-0 h-5 w-5 flex-shrink-0 text-[#1E3A8A]/60 hover:text-[#1E3A8A]"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {showConnectTeacher && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#3B82F6]/20">
                    <p className="text-xs text-[#1E3A8A]/70 font-medium">Need help?</p>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onSupportClick) {
                          onSupportClick();
                        } else if (supportEmail) {
                          const subject = encodeURIComponent("Support Request - English Pro AI");
                          const body = encodeURIComponent(
                            "Please describe your issue below:\n\n\n(You can attach a screenshot to this email to help us understand the problem.)"
                          );
                          window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
                        } else {
                          navigate("/connect-teacher");
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#3B82F6] to-[#00B9FC] text-white hover:from-[#2563EB] hover:to-[#0099CC] transition-all duration-200 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{supportEmail ? "Need Support?" : "Connect with Teacher"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={floatingAnimation}
        transition={{
          duration: floatingDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative cursor-pointer"
        onClick={onClick}
        style={{
          cursor: onClick ? "pointer" : "default",
          position: "relative",
          zIndex: 65,
          minWidth: iconSize,
          minHeight: iconSize,
        }}
        role={onClick ? "button" : undefined}
        aria-label={onClick ? "Show message" : undefined}
      >
        {!isMobile && (
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-gradient-to-br from-[#3B82F6] to-[#00B9FC] rounded-full blur-2xl pointer-events-none"
          />
        )}

        {state === "celebrating" && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, (Math.random() - 0.5) * 100],
                  y: [0, -Math.random() * 80],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                className="absolute pointer-events-none"
                style={{ left: "50%", top: "50%" }}
              >
                <Sparkles className="w-4 h-4 text-[#FFD600]" />
              </motion.div>
            ))}
          </>
        )}

        {/* Mello Character - SVG (smaller on mobile to avoid overlap) */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 120 120"
          style={{ position: "relative", zIndex: 10 }}
        >
          <defs>
            <radialGradient id="bodyGradient" cx="50%" cy="40%">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#BAE6FD" />
              <stop offset="100%" stopColor="#7DD3FC" />
            </radialGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Cloud Body */}
          <g filter="url(#softGlow)">
            {/* Main cloud shape */}
            <ellipse cx="60" cy="65" rx="45" ry="40" fill="url(#bodyGradient)" />
            
            {/* Cloud bumps for fluffy effect */}
            <circle cx="35" cy="55" r="20" fill="url(#bodyGradient)" />
            <circle cx="85" cy="55" r="20" fill="url(#bodyGradient)" />
            <circle cx="60" cy="45" r="22" fill="url(#bodyGradient)" />
            
            {/* Bottom cloud bumps */}
            <circle cx="45" cy="75" r="18" fill="url(#bodyGradient)" />
            <circle cx="75" cy="75" r="18" fill="url(#bodyGradient)" />
          </g>

          {/* Eyes */}
          <g>
            {/* Left eye */}
            <ellipse
              cx="48"
              cy="58"
              rx="8"
              ry={isBlinking ? "1" : "10"}
              fill="#1E3A8A"
              style={{
                transform: `scale(${eyeScale})`,
                transformOrigin: "48px 58px",
                transition: "all 0.15s ease",
              }}
            />
            {!isBlinking && (
              <>
                <circle cx="50" cy="55" r="3" fill="white" opacity="0.9" />
                <circle cx="46" cy="60" r="1.5" fill="white" opacity="0.6" />
              </>
            )}

            {/* Right eye */}
            <ellipse
              cx="72"
              cy="58"
              rx="8"
              ry={isBlinking ? "1" : "10"}
              fill="#1E3A8A"
              style={{
                transform: `scale(${eyeScale})`,
                transformOrigin: "72px 58px",
                transition: "all 0.15s ease",
              }}
            />
            {!isBlinking && (
              <>
                <circle cx="74" cy="55" r="3" fill="white" opacity="0.9" />
                <circle cx="70" cy="60" r="1.5" fill="white" opacity="0.6" />
              </>
            )}
          </g>

          {/* Rosy Cheeks */}
          <ellipse cx="35" cy="68" rx="8" ry="6" fill="#FFB6C1" opacity="0.4" />
          <ellipse cx="85" cy="68" rx="8" ry="6" fill="#FFB6C1" opacity="0.4" />

          {/* Smile */}
          <path
            d="M 45 72 Q 60 80 75 72"
            stroke="#1E3A8A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />

          {/* Sparkle on head */}
          <g opacity={eyeScale > 1 ? "1" : "0.7"}>
            <path
              d="M 60 35 L 62 40 L 67 42 L 62 44 L 60 49 L 58 44 L 53 42 L 58 40 Z"
              fill="#FFD600"
            />
          </g>

          {/* Waving Hands - only show when state is "waving" */}
          {state === "waving" && (
            <>
              {/* Left hand - waving */}
              <circle cx="20" cy="65" r="8" fill="url(#bodyGradient)">
                <animate
                  attributeName="cy"
                  values="65;53;65"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="20;16;20"
                  dur="0.6s"
                  repeatCount="indefinite"
                />
              </circle>
              
              {/* Right hand - waving */}
              <circle cx="100" cy="65" r="8" fill="url(#bodyGradient)">
                <animate
                  attributeName="cy"
                  values="65;53;65"
                  dur="0.6s"
                  begin="0.3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cx"
                  values="100;104;100"
                  dur="0.6s"
                  begin="0.3s"
                  repeatCount="indefinite"
                />
              </circle>
            </>
          )}
        </svg>

        {!isMobile && (
          <motion.div
            animate={{ scale: [1, 1.15], opacity: [0.15, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute inset-0 border border-[#3B82F6]/50 rounded-full pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
}