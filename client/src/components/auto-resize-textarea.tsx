import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
  maxHeight?: number;
}

export default function AutoResizeTextarea({ 
  value, 
  onChange, 
  className, 
  minHeight = 40,
  maxHeight = 500,
  ...props 
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    autoResize();
  }, [value]);

  useEffect(() => {
    autoResize();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    autoResize();
  };

  // Handle Android keyboard overlay
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Scroll element into view on Android to avoid keyboard overlay
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onFocus={handleFocus}
      className={cn(
        "resize-none overflow-hidden",
        className
      )}
      style={{ minHeight: `${minHeight}px` }}
      {...props}
    />
  );
}